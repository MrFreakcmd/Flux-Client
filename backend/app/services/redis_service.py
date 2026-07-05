import redis.asyncio as aioredis
from contextlib import asynccontextmanager
from app.config import settings
import asyncio
import logging
import uuid

logger = logging.getLogger(__name__)

# Global Redis client
redis_client = aioredis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

@asynccontextmanager
async def acquire_lock(lock_name: str, timeout_seconds: int = 10, retry_interval: float = 0.1):
    """
    Acquires a Redis distributed lock (using SET NX EX).
    Usage:
        async with acquire_lock("coins:user_id"):
            # perform database/ledger operations safely
    """
    key = f"lock:{lock_name}"
    token = str(uuid.uuid4())
    elapsed = 0.0
    acquired = False
    
    while elapsed < timeout_seconds:
        res = await redis_client.set(key, token, ex=timeout_seconds, nx=True)
        if res:
            acquired = True
            break
        await asyncio.sleep(retry_interval)
        elapsed += retry_interval
        
    if not acquired:
        logger.error(f"Failed to acquire lock: {lock_name}")
        raise RuntimeError(f"Conflict: Lock acquisition timed out for {lock_name}")
        
    try:
        yield
    finally:
        # Release only if we still own the lock token.
        current_value = await redis_client.get(key)
        if current_value == token:
            await redis_client.delete(key)
