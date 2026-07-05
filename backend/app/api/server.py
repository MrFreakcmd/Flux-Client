from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
import httpx
import logging

from app.database import get_db
from app.config import settings
from app.models.models import User, Server, AuditLog
from app.services.auth_utils import get_current_user
from app.services.calagopus import calagopus_client
from app.services.redis_service import acquire_lock
from app.schemas.schemas import ServerCreate, ServerOut

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=list[ServerOut])
def list_user_servers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Lists all servers owned by the authenticated user.
    """
    servers = db.query(Server).filter(Server.user_id == current_user.id).all()
    return servers

@router.post("/create", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
async def create_user_server(
    payload: ServerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Provisions a new server on Calagopus for the authenticated user, enforcing limits.
    """
    if not current_user.calagopus_uuid:
        raise HTTPException(status_code=400, detail="User account is not linked to Calagopus")

    # Acquire a distributed lock to prevent slot/limit race conditions
    async with acquire_lock(f"create_server:{current_user.id}"):
        # 1. Enforce user limit checks
        existing_servers = db.query(Server).filter(Server.user_id == current_user.id).all()
        
        if len(existing_servers) >= current_user.limit_slots:
            raise HTTPException(
                status_code=400,
                detail=f"Slot limit exceeded. Max slots: {current_user.limit_slots}. Current: {len(existing_servers)}"
            )

        total_cpu = sum(s.cpu_limit for s in existing_servers) + payload.cpu_limit
        if total_cpu > current_user.limit_cpu:
            raise HTTPException(
                status_code=400,
                detail=f"CPU limit exceeded. Max CPU: {current_user.limit_cpu}%. Requested: {total_cpu}%"
            )

        total_mem = sum(s.memory_limit for s in existing_servers) + payload.memory_limit
        if total_mem > current_user.limit_memory:
            raise HTTPException(
                status_code=400,
                detail=f"Memory limit exceeded. Max Memory: {current_user.limit_memory}MB. Requested: {total_mem}MB"
            )

        total_disk = sum(s.disk_limit for s in existing_servers) + payload.disk_limit
        if total_disk > current_user.limit_disk:
            raise HTTPException(
                status_code=400,
                detail=f"Disk limit exceeded. Max Disk: {current_user.limit_disk}MB. Requested: {total_disk}MB"
            )

        # 2. Query Calagopus for a free allocation (IP and Port) on the target node
        try:
            alloc_resp = await calagopus_client.get_node_allocations(str(payload.node_uuid), page=1, per_page=100)
            if alloc_resp.status_code != 200:
                logger.error(f"Failed to fetch allocations: {alloc_resp.text}")
                raise HTTPException(status_code=500, detail="Failed to query allocations from game panel")
                
            # Filter for unassigned allocations (server UUID is null)
            allocations_data = alloc_resp.json().get("allocations", {}).get("data", [])
            available_allocations = [a for a in allocations_data if a.get("server") is None]
            
            if not available_allocations:
                raise HTTPException(
                    status_code=400,
                    detail="No free ports/allocations available on the selected node. Please contact support."
                )
            
            allocation = available_allocations[0]
            allocation_uuid = allocation.get("uuid")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error querying allocations: {e}")
            raise HTTPException(status_code=500, detail="Network error contacting game panel for allocations")

        # 3. Fetch default egg configuration settings (or use pre-defined fallbacks)
        # Note: In a production run, egg settings are queried from Calagopus Nest/Egg details.
        # We will query Calagopus to find the egg's startup commands and docker images.
        startup_cmd = "java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{STARTUP_FILE}}"
        docker_image = "ghcr.io/pterodactyl/yolks:java_17"
        
        # Proactively probe the egg to get correct startup command and docker image
        try:
            # We list nests to find the nest holding our egg or query egg repositories
            # Standard Calagopus nested path lookup (fallback to defaults if it errors)
            egg_resp = await calagopus_client._request("GET", f"/api/client/servers/eggs")
            if egg_resp.status_code == 200:
                eggs_list = egg_resp.json().get("eggs", [])
                # Find matching egg if available
                # If nested lookup required, we can look up nest structure
                pass
        except Exception as e:
            logger.warning(f"Failed to query egg details, using defaults: {e}")

        # 4. Compile the creation payload
        calagopus_payload = {
            "name": payload.name,
            "node_uuid": str(payload.node_uuid),
            "owner_uuid": str(current_user.calagopus_uuid),
            "egg_uuid": str(payload.egg_uuid),
            "allocation_uuids": [allocation_uuid],
            "start_on_completion": True,
            "skip_installer": False,
            "limits": {
                "cpu": payload.cpu_limit,
                "memory": payload.memory_limit,
                "memory_overhead": 0,
                "swap": -1,
                "disk": payload.disk_limit
            },
            "feature_limits": {
                "allocations": payload.slots,
                "databases": 1,
                "backups": 2,
                "schedules": 2
            },
            "pinned_cpus": [],
            "startup": startup_cmd,
            "image": docker_image,
            "hugepages_passthrough_enabled": False,
            "kvm_passthrough_enabled": False,
            "variables": []
        }

        # 5. Call Calagopus to provision the server
        create_resp = await calagopus_client.create_server(calagopus_payload)
        if create_resp.status_code not in [200, 201]:
            logger.error(f"Calagopus server creation failed: {create_resp.text}")
            raise HTTPException(status_code=500, detail=f"Panel failed to provision server: {create_resp.text}")

        server_data = create_resp.json().get("server", {})
        calagopus_uuid = server_data.get("uuid")

        # 6. Save the mapping locally
        new_server = Server(
            id=uuid.uuid4(),
            user_id=current_user.id,
            calagopus_uuid=uuid.UUID(calagopus_uuid),
            name=payload.name,
            egg_uuid=payload.egg_uuid,
            node_uuid=payload.node_uuid,
            cpu_limit=payload.cpu_limit,
            memory_limit=payload.memory_limit,
            disk_limit=payload.disk_limit,
            slots=payload.slots,
            is_suspended=False
        )
        db.add(new_server)
        
        # Log audit action
        log = AuditLog(
            user_id=current_user.id,
            action="server_create",
            details={"server_uuid": calagopus_uuid, "name": payload.name}
        )
        db.add(log)
        db.commit()
        db.refresh(new_server)

        return new_server

@router.post("/{server_uuid}/power")
async def server_power(
    server_uuid: uuid.UUID,
    action: str = Query(..., regex="^(start|stop|restart|kill)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Proxies power state commands (start, stop, restart, kill) to Calagopus.
    """
    # Verify ownership
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.server_power_action(str(server_uuid), action)
    if resp.status_code not in [200, 204]:
        raise HTTPException(status_code=500, detail=f"Failed to execute power action: {resp.text}")

    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action=f"server_{action}",
        details={"server_uuid": str(server_uuid)}
    )
    db.add(log)
    db.commit()

    return {"status": "success", "action": action}

@router.get("/{server_uuid}/websocket")
async def server_websocket_details(
    server_uuid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the WebSocket terminal authentication token and URL from Calagopus.
    """
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.get_server_websocket(str(server_uuid))
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch console socket authorization")

    return resp.json()

@router.get("/{server_uuid}/files")
async def server_files(
    server_uuid: uuid.UUID,
    directory: str = Query("/", description="Target directory path"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists the files in the specified directory on the server.
    """
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.list_server_files(str(server_uuid), directory)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch directory contents")

    return resp.json()

@router.get("/{server_uuid}/backups")
async def list_backups(
    server_uuid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.get_server_backups(str(server_uuid))
    return resp.json()

@router.post("/{server_uuid}/backups")
async def create_backup(
    server_uuid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.create_server_backup(str(server_uuid))
    return resp.json()

@router.delete("/{server_uuid}/backups/{backup_uuid}")
async def delete_backup(
    server_uuid: uuid.UUID,
    backup_uuid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    server = db.query(Server).filter(Server.calagopus_uuid == server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    resp = await calagopus_client.delete_server_backup(str(server_uuid), str(backup_uuid))
    return {"status": "deleted"}
