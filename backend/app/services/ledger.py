from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.models import CoinLedger, User
from app.services.redis_service import acquire_lock


async def mutate_user_coins(
    db: Session,
    user: User,
    amount: Decimal,
    ledger_type: str,
    description: str,
    reference_id: str | None = None,
) -> User:
    """
    Mutate a user's coin balance under a distributed lock and append a ledger row.
    """
    async with acquire_lock(f"coins:{user.id}"):
        locked_user = db.query(User).filter(User.id == user.id).with_for_update().first()
        if locked_user is None:
            raise RuntimeError("User no longer exists")

        locked_user.coins = Decimal(str(locked_user.coins)) + Decimal(str(amount))

        ledger = CoinLedger(
            user_id=locked_user.id,
            amount=Decimal(str(amount)),
            running_balance=locked_user.coins,
            type=ledger_type,
            description=description,
            reference_id=reference_id,
        )
        db.add(ledger)
        db.flush()
        return locked_user
