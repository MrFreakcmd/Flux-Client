from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.api import afk


class FakeUser:
    def __init__(self, user_id="user-1", coins="10.00"):
        self.id = user_id
        self.coins = Decimal(coins)


class FakeDb:
    def __init__(self):
        self.added = []
        self.committed = False

    def add(self, item):
        self.added.append(item)

    def commit(self):
        self.committed = True


class FakeRedis:
    def __init__(self):
        self.store = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value):
        self.store[key] = value
        return True


async def fake_mutate_user_coins(db, user, amount, ledger_type, description, reference_id=None):
    user.coins = Decimal(str(user.coins)) + Decimal(str(amount))
    return user


@pytest.mark.asyncio
async def test_afk_heartbeat_initializes_without_credit(monkeypatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr(afk, "redis_client", fake_redis)
    monkeypatch.setattr(afk, "mutate_user_coins", fake_mutate_user_coins)
    monkeypatch.setattr(afk.settings, "AFK_REWARD_PER_HEARTBEAT", 1.0)

    user = FakeUser()
    db = FakeDb()

    result = await afk.heartbeat(current_user=user, db=db)

    assert result.credited is False
    assert result.reward == Decimal("0")
    assert result.balance == Decimal("10.00")
    assert "initialized" in result.message.lower()


@pytest.mark.asyncio
async def test_afk_heartbeat_credits_only_in_valid_window(monkeypatch):
    fake_redis = FakeRedis()
    now = datetime.now(timezone.utc)
    fake_redis.store["afk:last_heartbeat:user-1"] = (now - timedelta(seconds=60)).isoformat()
    monkeypatch.setattr(afk, "redis_client", fake_redis)
    monkeypatch.setattr(afk, "mutate_user_coins", fake_mutate_user_coins)
    monkeypatch.setattr(afk.settings, "AFK_REWARD_PER_HEARTBEAT", 1.0)

    user = FakeUser()
    db = FakeDb()

    result = await afk.heartbeat(current_user=user, db=db)

    assert result.credited is True
    assert result.reward == Decimal("1.0")
    assert result.balance == Decimal("11.00")
    assert db.committed is True
