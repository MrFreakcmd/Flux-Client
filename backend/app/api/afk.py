from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AFKHeartbeatOut
from app.services.auth_utils import get_current_user
from app.services.ledger import mutate_user_coins
from app.services.redis_service import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()

MIN_INTERVAL_SECONDS = 55
MAX_INTERVAL_SECONDS = 70


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


@router.post("/heartbeat", response_model=AFKHeartbeatOut)
async def heartbeat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    key = f"afk:last_heartbeat:{current_user.id}"
    reward = Decimal(str(settings.AFK_REWARD_PER_HEARTBEAT))

    last_seen_raw = await redis_client.get(key)
    if last_seen_raw is None:
        await redis_client.set(key, now.isoformat())
        return AFKHeartbeatOut(
            credited=False,
            reward=Decimal("0"),
            elapsed_seconds=None,
            next_eligible_in=float(MIN_INTERVAL_SECONDS),
            balance=Decimal(str(current_user.coins)),
            message="AFK session initialized. Submit another heartbeat in about a minute.",
        )

    last_seen = _parse_timestamp(last_seen_raw)
    elapsed_seconds = (now - last_seen).total_seconds()
    await redis_client.set(key, now.isoformat())

    if elapsed_seconds < MIN_INTERVAL_SECONDS:
        return AFKHeartbeatOut(
            credited=False,
            reward=Decimal("0"),
            elapsed_seconds=elapsed_seconds,
            next_eligible_in=float(MIN_INTERVAL_SECONDS - elapsed_seconds),
            balance=Decimal(str(current_user.coins)),
            message="Heartbeat arrived too early. No coins were credited.",
        )

    if elapsed_seconds > MAX_INTERVAL_SECONDS:
        return AFKHeartbeatOut(
            credited=False,
            reward=Decimal("0"),
            elapsed_seconds=elapsed_seconds,
            next_eligible_in=0,
            balance=Decimal(str(current_user.coins)),
            message="Heartbeat arrived too late. The streak was reset.",
        )

    locked_user = await mutate_user_coins(
        db=db,
        user=current_user,
        amount=reward,
        ledger_type="afk",
        description=f"AFK heartbeat reward after {elapsed_seconds:.2f} seconds",
        reference_id=key,
    )
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="afk_heartbeat",
            details={"elapsed_seconds": elapsed_seconds, "reward": float(reward)},
        )
    )
    db.commit()

    return AFKHeartbeatOut(
        credited=True,
        reward=reward,
        elapsed_seconds=elapsed_seconds,
        next_eligible_in=float(MIN_INTERVAL_SECONDS),
        balance=Decimal(str(locked_user.coins)),
        message="AFK heartbeat accepted and coins credited.",
    )
