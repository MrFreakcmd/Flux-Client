from contextlib import asynccontextmanager
from decimal import Decimal

import pytest

from app.models.models import CoinLedger
from app.services import ledger as ledger_service


class FakeUser:
    def __init__(self, user_id="user-1", coins="10.00"):
        self.id = user_id
        self.coins = Decimal(coins)


class FakeQuery:
    def __init__(self, user):
        self._user = user

    def filter(self, *_args, **_kwargs):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self._user


class FakeDb:
    def __init__(self, user):
        self.user = user
        self.added = []

    def query(self, _model):
        return FakeQuery(self.user)

    def add(self, item):
        self.added.append(item)

    def flush(self):
        return None


@asynccontextmanager
async def no_lock(_lock_name, **_kwargs):
    yield


@pytest.mark.asyncio
async def test_mutate_user_coins_keeps_running_balance(monkeypatch):
    monkeypatch.setattr(ledger_service, "acquire_lock", no_lock)

    user = FakeUser()
    db = FakeDb(user)

    updated = await ledger_service.mutate_user_coins(
        db=db,
        user=user,
        amount=Decimal("5.00"),
        ledger_type="grant",
        description="Initial credit",
        reference_id="ref-1",
    )

    assert updated.coins == Decimal("15.00")
    first_ledger = next(item for item in db.added if isinstance(item, CoinLedger))
    assert first_ledger.amount == Decimal("5.00")
    assert first_ledger.running_balance == Decimal("15.00")

    updated = await ledger_service.mutate_user_coins(
        db=db,
        user=user,
        amount=Decimal("-2.00"),
        ledger_type="purchase",
        description="Debit",
        reference_id="ref-2",
    )

    assert updated.coins == Decimal("13.00")
    ledgers = [item for item in db.added if isinstance(item, CoinLedger)]
    assert ledgers[-1].amount == Decimal("-2.00")
    assert ledgers[-1].running_balance == Decimal("13.00")
