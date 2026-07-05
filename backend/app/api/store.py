from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid
import logging

from app.database import get_db
from app.models.models import User, Server, CoinLedger, AuditLog
from app.services.auth_utils import get_current_user
from app.services.redis_service import acquire_lock
from app.services.calagopus import calagopus_client
from app.schemas.schemas import StoreUpgradeRequest

logger = logging.getLogger(__name__)
router = APIRouter()

# Pricing Config (Coins)
PRICE_PER_CPU_10 = Decimal("2.00")    # 2 coins per 10% CPU
PRICE_PER_RAM_128 = Decimal("1.00")   # 1 coin per 128MB RAM
PRICE_PER_DISK_1000 = Decimal("1.00")  # 1 coin per 1000MB Disk
PRICE_PER_SLOT = Decimal("10.00")     # 10 coins per server slot

class GlobalUpgradeRequest(StoreUpgradeRequest):
    # Overwrite class to inherit or define inline for global limits
    pass

@router.get("/prices")
def get_prices():
    """
    Returns the prices for resources in coins.
    """
    return {
        "cpu_10_percent": float(PRICE_PER_CPU_10),
        "ram_128_mb": float(PRICE_PER_RAM_128),
        "disk_1000_mb": float(PRICE_PER_DISK_1000),
        "slot": float(PRICE_PER_SLOT)
    }

@router.post("/buy-limits")
async def buy_global_limits(
    cpu_delta: int = 0,     # CPU % to add (must be multiple of 10)
    memory_delta: int = 0,  # RAM MB to add (must be multiple of 128)
    disk_delta: int = 0,    # Disk MB to add (must be multiple of 1000)
    slots_delta: int = 0,   # Slots to add
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Spends coins to upgrade the user's global resource pools.
    """
    if cpu_delta < 0 or memory_delta < 0 or disk_delta < 0 or slots_delta < 0:
        raise HTTPException(status_code=400, detail="Resource deltas must be positive")
        
    if cpu_delta % 10 != 0:
        raise HTTPException(status_code=400, detail="CPU delta must be a multiple of 10")
    if memory_delta % 128 != 0:
        raise HTTPException(status_code=400, detail="Memory delta must be a multiple of 128")
    if disk_delta % 1000 != 0:
        raise HTTPException(status_code=400, detail="Disk delta must be a multiple of 1000")

    # Calculate total cost
    cost_cpu = Decimal(cpu_delta // 10) * PRICE_PER_CPU_10
    cost_ram = Decimal(memory_delta // 128) * PRICE_PER_RAM_128
    cost_disk = Decimal(disk_delta // 1000) * PRICE_PER_DISK_1000
    cost_slots = Decimal(slots_delta) * PRICE_PER_SLOT
    
    total_cost = cost_cpu + cost_ram + cost_disk + cost_slots
    
    if total_cost <= 0:
        raise HTTPException(status_code=400, detail="No upgrades specified")

    # Acquire lock on the user's ledger to prevent concurrent deductions
    async with acquire_lock(f"coins:{current_user.id}"):
        # Refetch user to get the latest balance inside the locked context
        user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
        
        if user.coins < total_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Cost: {total_cost} coins. Balance: {user.coins} coins."
            )
            
        # Deduct coins and update limits
        user.coins -= total_cost
        user.limit_cpu += cpu_delta
        user.limit_memory += memory_delta
        user.limit_disk += disk_delta
        user.limit_slots += slots_delta
        
        # Log to ledger
        ledger = CoinLedger(
            user_id=user.id,
            amount=-total_cost,
            running_balance=user.coins,
            type="purchase",
            description=f"Purchased limits: CPU +{cpu_delta}%, RAM +{memory_delta}MB, Disk +{disk_delta}MB, Slots +{slots_delta}"
        )
        db.add(ledger)
        
        # Log audit trail
        log = AuditLog(
            user_id=user.id,
            action="buy_limits",
            details={
                "cost": float(total_cost),
                "cpu_added": cpu_delta,
                "memory_added": memory_delta,
                "disk_added": disk_delta,
                "slots_added": slots_delta
            }
        )
        db.add(log)
        db.commit()
        
        return {
            "status": "success",
            "message": "Resource limits upgraded successfully",
            "new_limits": {
                "cpu": user.limit_cpu,
                "memory": user.limit_memory,
                "disk": user.limit_disk,
                "slots": user.limit_slots
            },
            "remaining_coins": float(user.coins)
        }

@router.post("/configure-server")
async def configure_server_resources(
    payload: StoreUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies resource updates to a specific server, allocating/deallocating from the user's global pool.
    """
    # Fetch target server
    server = db.query(Server).filter(Server.calagopus_uuid == payload.server_uuid, Server.user_id == current_user.id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or access denied")

    # Lock creation to prevent race conditions on limit reallocation
    async with acquire_lock(f"create_server:{current_user.id}"):
        # Get all other servers to sum up resource usage
        other_servers = db.query(Server).filter(
            Server.user_id == current_user.id, 
            Server.id != server.id
        ).all()
        
        target_cpu = sum(s.cpu_limit for s in other_servers) + server.cpu_limit + payload.cpu_delta
        target_mem = sum(s.memory_limit for s in other_servers) + server.memory_limit + payload.memory_delta
        target_disk = sum(s.disk_limit for s in other_servers) + server.disk_limit + payload.disk_delta
        target_slots = sum(s.slots for s in other_servers) + server.slots + payload.slots_delta

        # Enforce global limits
        if target_cpu > current_user.limit_cpu:
            raise HTTPException(status_code=400, detail=f"Requested CPU ({target_cpu}%) exceeds your limit of {current_user.limit_cpu}%")
        if target_mem > current_user.limit_memory:
            raise HTTPException(status_code=400, detail=f"Requested RAM ({target_mem}MB) exceeds your limit of {current_user.limit_memory}MB")
        if target_disk > current_user.limit_disk:
            raise HTTPException(status_code=400, detail=f"Requested Disk ({target_disk}MB) exceeds your limit of {current_user.limit_disk}MB")
            
        # Delta validations
        new_cpu = server.cpu_limit + payload.cpu_delta
        new_mem = server.memory_limit + payload.memory_delta
        new_disk = server.disk_limit + payload.disk_delta
        new_slots = server.slots + payload.slots_delta
        
        if new_cpu < 10 or new_mem < 128 or new_disk < 512 or new_slots < 1:
            raise HTTPException(status_code=400, detail="Cannot downgrade server resources below minimum thresholds (10% CPU, 128MB RAM, 512MB Disk)")

        # Sync changes to Calagopus panel via the Admin API
        calagopus_update_payload = {
            "limits": {
                "cpu": new_cpu,
                "memory": new_mem,
                "memory_overhead": 0,
                "swap": -1,
                "disk": new_disk
            },
            "feature_limits": {
                "allocations": new_slots,
                "databases": 1,
                "backups": 2,
                "schedules": 2
            }
        }
        
        resp = await calagopus_client.update_server(str(payload.server_uuid), calagopus_update_payload)
        if resp.status_code not in [200, 204]:
            logger.error(f"Calagopus server update failed: {resp.text}")
            raise HTTPException(status_code=500, detail=f"Game panel failed to update server resources: {resp.text}")

        # Update local DB record
        server.cpu_limit = new_cpu
        server.memory_limit = new_mem
        server.disk_limit = new_disk
        server.slots = new_slots
        
        log = AuditLog(
            user_id=current_user.id,
            action="configure_server",
            details={
                "server_uuid": str(payload.server_uuid),
                "cpu_limit": new_cpu,
                "memory_limit": new_mem,
                "disk_limit": new_disk,
                "slots": new_slots
            }
        )
        db.add(log)
        db.commit()
        
        return {
            "status": "success",
            "message": "Server resources updated successfully",
            "server": {
                "calagopus_uuid": str(payload.server_uuid),
                "cpu": new_cpu,
                "memory": new_mem,
                "disk": new_disk,
                "slots": new_slots
            }
        }
