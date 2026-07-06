from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, CoinLedger, Server, User
from app.schemas.schemas import GiftCoinsRequest
from app.services.auth_utils import get_current_user
from app.services.redis_service import acquire_lock

router = APIRouter()


def _public_user_payload(db: Session, user: User) -> dict:
    server_count = db.query(Server).filter(Server.user_id == user.id).count()
    positive_ledger_count = (
        db.query(CoinLedger)
        .filter(CoinLedger.user_id == user.id, CoinLedger.amount > 0)
        .count()
    )
    return {
        "id": str(user.id),
        "discord_id": user.discord_id,
        "username": user.username,
        "avatar": user.avatar,
        "coins": str(user.coins),
        "server_count": server_count,
        "reward_count": positive_ledger_count,
        "created_at": user.created_at,
    }


def _find_user(db: Session, user_identifier: str) -> User | None:
    try:
        user_uuid = uuid.UUID(user_identifier)
        user = db.query(User).filter(User.id == user_uuid).first()
        if user:
            return user
    except ValueError:
        pass

    return db.query(User).filter(User.discord_id == user_identifier).first()


@router.get("/leaderboard")
def leaderboard(
    category: str = Query("coins", pattern="^(coins|servers|rewards)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    if category == "servers":
        rows = (
            db.query(User, func.count(Server.id).label("score"))
            .outerjoin(Server, Server.user_id == User.id)
            .group_by(User.id)
            .order_by(desc("score"), desc(User.created_at))
            .limit(25)
            .all()
        )
    elif category == "rewards":
        rows = (
            db.query(User, func.count(CoinLedger.id).label("score"))
            .outerjoin(CoinLedger, (CoinLedger.user_id == User.id) & (CoinLedger.amount > 0))
            .group_by(User.id)
            .order_by(desc("score"), desc(User.created_at))
            .limit(25)
            .all()
        )
    else:
        rows = (
            db.query(User, User.coins.label("score"))
            .order_by(desc(User.coins), desc(User.created_at))
            .limit(25)
            .all()
        )

    return {
        "category": category,
        "leaders": [
            {
                "rank": index + 1,
                "score": str(score),
                "user": _public_user_payload(db, user),
            }
            for index, (user, score) in enumerate(rows)
        ],
    }


@router.get("/search")
def search_users(
    query: str = Query(..., min_length=2, max_length=80),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    like_query = f"%{query.strip()}%"
    users = (
        db.query(User)
        .filter(or_(User.username.ilike(like_query), User.discord_id.ilike(like_query), User.email.ilike(like_query)))
        .order_by(User.username)
        .limit(12)
        .all()
    )
    return {"users": [_public_user_payload(db, user) for user in users]}


@router.get("/profile/{user_identifier}")
def read_profile(
    user_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    user = _find_user(db, user_identifier)
    if user is None:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"profile": _public_user_payload(db, user)}


@router.post("/gift")
async def gift_coins(
    payload: GiftCoinsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot gift coins to yourself")

    minimum = Decimal(str(settings.GIFT_MIN_COINS))
    amount = Decimal(str(payload.amount)).quantize(Decimal("0.01"))
    if amount < minimum:
        raise HTTPException(status_code=400, detail=f"Minimum gift amount is {minimum} coins")

    recipient = db.query(User).filter(User.id == payload.recipient_id).first()
    if recipient is None:
        raise HTTPException(status_code=404, detail="Recipient not found")

    lock_names = sorted([f"coins:{current_user.id}", f"coins:{recipient.id}"])
    async with acquire_lock(lock_names[0]):
        async with acquire_lock(lock_names[1]):
            giver = db.query(User).filter(User.id == current_user.id).with_for_update().first()
            receiver = db.query(User).filter(User.id == recipient.id).with_for_update().first()
            if giver is None or receiver is None:
                raise HTTPException(status_code=404, detail="User no longer exists")
            if Decimal(str(giver.coins)) < amount:
                raise HTTPException(status_code=400, detail="Insufficient balance for this gift")

            giver.coins = Decimal(str(giver.coins)) - amount
            receiver.coins = Decimal(str(receiver.coins)) + amount

            db.add(
                CoinLedger(
                    user_id=giver.id,
                    amount=-amount,
                    running_balance=giver.coins,
                    type="p2p_transfer",
                    description=f"Gift sent to {receiver.username}",
                    reference_id=str(receiver.id),
                )
            )
            db.add(
                CoinLedger(
                    user_id=receiver.id,
                    amount=amount,
                    running_balance=receiver.coins,
                    type="p2p_transfer",
                    description=f"Gift received from {giver.username}",
                    reference_id=str(giver.id),
                )
            )
            db.add(
                AuditLog(
                    user_id=giver.id,
                    action="gift_coins",
                    details={"recipient_id": str(receiver.id), "amount": str(amount), "note": payload.note},
                )
            )
            db.commit()

    return {
        "status": "sent",
        "amount": str(amount),
        "recipient": _public_user_payload(db, recipient),
        "remaining_coins": str(giver.coins),
    }
