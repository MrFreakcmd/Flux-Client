from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from decimal import Decimal
import logging

from app.database import get_db
from app.models.models import User, AuditLog, CoinLedger, Server
from app.services.auth_utils import get_current_user
from app.schemas.schemas import UserOut, AdminUserUpdateRequest, AdminGrantCoinsRequest

logger = logging.getLogger(__name__)
router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get overall system statistics"""
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.servers.any()).scalar()
    total_servers = db.query(func.count(Server.id)).scalar()
    total_coins_issued = db.query(func.sum(CoinLedger.amount)).filter(
        CoinLedger.type.in_(["grant", "purchase", "referral", "afk"])
    ).scalar()

    # Get coin distribution
    coin_distribution = db.query(
        User.id,
        User.username,
        User.coins
    ).order_by(desc(User.coins)).limit(10).all()

    return {
        "total_users": total_users or 0,
        "active_users": active_users or 0,
        "total_servers": total_servers or 0,
        "total_coins_issued": str(total_coins_issued or 0),
        "top_users": [
            {
                "id": str(u[0]),
                "username": u[1],
                "coins": str(u[2])
            }
            for u in coin_distribution
        ]
    }


@router.get("/users")
async def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None)
):
    """List all users with pagination and search"""
    query = db.query(User)

    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.discord_id.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "users": [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "discord_id": u.discord_id,
                "coins": str(u.coins),
                "is_admin": u.is_admin,
                "is_suspended": u.is_suspended if hasattr(u, 'is_suspended') else False,
                "created_at": u.created_at.isoformat(),
                "servers_count": len(u.servers)
            }
            for u in users
        ]
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific user"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ledger = db.query(CoinLedger).filter(CoinLedger.user_id == user.id).all()
    servers = db.query(Server).filter(Server.user_id == user.id).all()

    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "discord_id": user.discord_id,
        "avatar": user.avatar,
        "coins": str(user.coins),
        "is_admin": user.is_admin,
        "limit_cpu": user.limit_cpu,
        "limit_memory": user.limit_memory,
        "limit_disk": user.limit_disk,
        "limit_slots": user.limit_slots,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
        "coin_ledger": [
            {
                "id": entry.id,
                "amount": str(entry.amount),
                "running_balance": str(entry.running_balance),
                "type": entry.type,
                "description": entry.description,
                "created_at": entry.created_at.isoformat()
            }
            for entry in ledger
        ],
        "servers": [
            {
                "id": str(s.id),
                "name": s.name,
                "cpu_limit": s.cpu_limit,
                "memory_limit": s.memory_limit,
                "disk_limit": s.disk_limit,
                "is_suspended": s.is_suspended,
                "created_at": s.created_at.isoformat()
            }
            for s in servers
        ]
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: AdminUserUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user properties (limits, admin status, etc.)"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting self
    if str(current_user.id) == user_id and body.is_admin is False:
        raise HTTPException(
            status_code=400,
            detail="Cannot demote yourself from admin"
        )

    # Update only allowed fields from schema
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.limit_cpu is not None:
        user.limit_cpu = body.limit_cpu
    if body.limit_memory is not None:
        user.limit_memory = body.limit_memory
    if body.limit_disk is not None:
        user.limit_disk = body.limit_disk
    if body.limit_slots is not None:
        user.limit_slots = body.limit_slots

    db.commit()

    logger.info(f"Admin {current_user.username} updated user {user.username}")

    return {
        "id": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin,
        "limit_cpu": user.limit_cpu,
        "limit_memory": user.limit_memory,
        "limit_disk": user.limit_disk,
        "limit_slots": user.limit_slots
    }


@router.post("/users/{user_id}/grant-coins")
async def grant_coins(
    user_id: str,
    body: AdminGrantCoinsRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Grant coins to a user."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    amount = body.amount
    description = body.description

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    amount = Decimal(str(amount))
    user.coins += amount

    ledger = CoinLedger(
        user_id=user.id,
        amount=amount,
        running_balance=user.coins,
        type="grant",
        description=f"Admin grant: {description}"
    )

    db.add(ledger)
    db.commit()

    logger.info(f"Admin {current_user.username} granted {amount} coins to {user.username}")

    return {
        "success": True,
        "user_coins": str(user.coins),
        "transaction_id": ledger.id
    }


@router.post("/users/{user_id}/promote")
async def promote_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Promote a user to admin"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="User is already an admin"
        )

    user.is_admin = True
    db.commit()

    logger.info(f"Admin {current_user.username} promoted user {user.username} to admin")

    return {
        "success": True,
        "user_id": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin
    }


@router.post("/users/{user_id}/demote")
async def demote_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Demote an admin user to regular user"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting yourself
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot demote yourself from admin"
        )

    if not user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="User is not an admin"
        )

    user.is_admin = False
    db.commit()

    logger.info(f"Admin {current_user.username} demoted user {user.username} from admin")

    return {
        "success": True,
        "user_id": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin
    }


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    body: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Suspend or unsuspend a user account"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent suspending yourself
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot suspend yourself"
        )

    # Prevent suspending other admins
    if user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="Cannot suspend admin accounts"
        )

    suspend = body.get("suspend", True)
    user.is_suspended = suspend

    db.commit()

    action = "suspended" if suspend else "unsuspended"
    logger.info(f"Admin {current_user.username} {action} user {user.username}")

    return {
        "success": True,
        "user_id": str(user.id),
        "is_suspended": user.is_suspended
    }


@router.get("/audit-logs")
async def get_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Query(None)
):
    """Get audit logs"""
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "logs": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ]
    }
