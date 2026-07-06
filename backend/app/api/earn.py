from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, EarnReward, RedeemCode, RedeemCodeUse, User
from app.schemas.schemas import RedeemCodeRequest
from app.services.auth_utils import get_current_user
from app.services.discord import check_guild_membership
from app.services.ledger import mutate_user_coins
from app.services.redis_service import acquire_lock

router = APIRouter()


def _link_providers() -> list[str]:
    return [provider.strip() for provider in settings.LINK_REWARD_PROVIDERS.split(",") if provider.strip()]


@router.get("/summary")
def earn_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rewards = db.query(EarnReward).filter(EarnReward.user_id == current_user.id).all()
    return {
        "balance": str(current_user.coins),
        "join_reward": {
            "enabled": bool(settings.DISCORD_REWARD_GUILD_ID and settings.DISCORD_BOT_TOKEN),
            "coins": settings.JOIN_REWARD_COINS,
            "claimed": any(reward.reward_type == "join" for reward in rewards),
        },
        "link_rewards": [
            {
                "provider": provider,
                "coins": settings.LINK_REWARD_COINS,
                "claimed": any(reward.reward_type == "link" and reward.provider == provider for reward in rewards),
            }
            for provider in _link_providers()
        ],
        "claimed_rewards": [
            {
                "type": reward.reward_type,
                "provider": reward.provider,
                "reward": str(reward.reward),
                "completed_at": reward.completed_at,
            }
            for reward in rewards
        ],
    }


@router.post("/redeem")
async def redeem_code(
    payload: RedeemCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code_value = payload.code.strip()
    redeem_code = db.query(RedeemCode).filter(RedeemCode.code == code_value, RedeemCode.active.is_(True)).first()
    if redeem_code is None:
        raise HTTPException(status_code=404, detail="Redeem code was not found or is inactive")
    if redeem_code.uses >= redeem_code.max_uses:
        raise HTTPException(status_code=400, detail="Redeem code has already reached its use limit")

    async with acquire_lock(f"redeem:{redeem_code.id}"):
        existing = (
            db.query(RedeemCodeUse)
            .filter(RedeemCodeUse.redeem_code_id == redeem_code.id, RedeemCodeUse.user_id == current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="You already used this redeem code")

        redeem_code.uses += 1
        db.add(RedeemCodeUse(redeem_code_id=redeem_code.id, user_id=current_user.id))
        credited_user = await mutate_user_coins(
            db=db,
            user=current_user,
            amount=Decimal(str(redeem_code.coins)),
            ledger_type="redeem",
            description=f"Redeemed code {redeem_code.code}",
            reference_id=str(redeem_code.id),
        )
        db.add(
            AuditLog(
                user_id=current_user.id,
                action="redeem_code",
                details={"code": redeem_code.code, "reward": str(redeem_code.coins)},
            )
        )
        db.commit()

    return {"status": "redeemed", "reward": str(redeem_code.coins), "balance": str(credited_user.coins)}


@router.post("/join")
async def claim_join_reward(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.DISCORD_REWARD_GUILD_ID or not settings.DISCORD_BOT_TOKEN:
        raise HTTPException(status_code=400, detail="Join-for-reward is not configured")

    is_member = await check_guild_membership(
        user_discord_id=current_user.discord_id,
        guild_id=settings.DISCORD_REWARD_GUILD_ID,
        bot_token=settings.DISCORD_BOT_TOKEN,
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Discord guild membership was not found")

    return await _claim_once(db, current_user, "join", settings.DISCORD_REWARD_GUILD_ID, Decimal(str(settings.JOIN_REWARD_COINS)))


@router.post("/links/{provider}")
async def claim_link_reward(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if provider not in _link_providers():
        raise HTTPException(status_code=404, detail="Link reward provider is not configured")

    return await _claim_once(db, current_user, "link", provider, Decimal(str(settings.LINK_REWARD_COINS)))


async def _claim_once(db: Session, user: User, reward_type: str, provider: str, reward: Decimal):
    async with acquire_lock(f"earn:{user.id}:{reward_type}:{provider}"):
        existing = (
            db.query(EarnReward)
            .filter(EarnReward.user_id == user.id, EarnReward.reward_type == reward_type, EarnReward.provider == provider)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Reward already claimed")

        db.add(EarnReward(user_id=user.id, reward_type=reward_type, provider=provider, reward=reward))
        credited_user = await mutate_user_coins(
            db=db,
            user=user,
            amount=reward,
            ledger_type=reward_type,
            description=f"{reward_type.title()} reward from {provider}",
            reference_id=provider,
        )
        db.add(
            AuditLog(
                user_id=user.id,
                action=f"earn_{reward_type}",
                details={"provider": provider, "reward": str(reward)},
            )
        )
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Reward already claimed") from None

    return {"status": "claimed", "provider": provider, "reward": str(reward), "balance": str(credited_user.coins)}
