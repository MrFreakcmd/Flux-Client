import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, Referral, User
from app.schemas.schemas import ReferralApplyRequest, ReferralOut
from app.services.auth_utils import get_current_user
from app.services.ledger import mutate_user_coins
from app.services.redis_service import acquire_lock

logger = logging.getLogger(__name__)
router = APIRouter()


def get_referral_code_for_user(user: User) -> str:
    """
    Use the user's Discord ID as a stable referral code.
    """
    return user.discord_id


async def apply_referral_code(
    db: Session,
    referred_user: User,
    code: str,
) -> Referral | None:
    code = code.strip()
    if not code:
        return None

    async with acquire_lock(f"referral:{referred_user.id}"):
        existing = db.query(Referral).filter(Referral.referred_id == referred_user.id).first()
        if existing:
            return existing

        referrer = db.query(User).filter(User.discord_id == code).first()
        if referrer is None or referrer.id == referred_user.id:
            return None

        referral = Referral(
            referrer_id=referrer.id,
            referred_id=referred_user.id,
            code=code,
            reward_granted=True,
        )
        db.add(referral)

        reward = Decimal(str(settings.REFERRAL_REWARD_COINS))
        await mutate_user_coins(
            db=db,
            user=referrer,
            amount=reward,
            ledger_type="referral",
            description=f"Referral reward for inviting {referred_user.username}",
            reference_id=str(referred_user.id),
        )
        db.add(
            AuditLog(
                user_id=referrer.id,
                action="referral_reward",
                details={
                    "referred_user_id": str(referred_user.id),
                    "referral_code": code,
                    "reward": float(reward),
                },
            )
        )
        logger.info("Applied referral code %s for referred user %s", code, referred_user.discord_id)
        return referral


@router.get("/code")
def read_referral_code(current_user: User = Depends(get_current_user)):
    code = get_referral_code_for_user(current_user)
    return {
        "code": code,
        "share_url": f"{settings.BACKEND_PUBLIC_URL}/api/auth/login?ref={code}",
    }


@router.post("/apply", response_model=ReferralOut)
async def redeem_referral_code(
    payload: ReferralApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    referral = await apply_referral_code(db=db, referred_user=current_user, code=payload.code)
    if referral is None:
        raise HTTPException(status_code=400, detail="Invalid or already-used referral code")
    db.commit()
    return referral


@router.get("/me", response_model=ReferralOut | None)
def referral_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    referral = db.query(Referral).filter(Referral.referred_id == current_user.id).first()
    return referral
