import asyncio
import os
from contextlib import suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base
from app.services.redis_service import redis_client
from app.api import account, announcements, auth, community, earn, images, server, store, ticket, afk, billing, security, referrals
from app.tasks import drift_sync
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Auto-create tables (fallback for local runs before running Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Flux Client API",
    description="Backend API for Flux Client Dashboard for Calagopus",
    version="1.0.0"
)

app.state.drift_sync_task = None

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to allowed client hosts
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Flux Client API...")
    try:
        await redis_client.ping()
        logger.info("Connected to Redis successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")

    if app.state.drift_sync_task is None:
        app.state.drift_sync_task = asyncio.create_task(drift_sync.run_drift_sync_loop())
        logger.info("Started drift sync background task.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Flux Client API...")
    drift_task = app.state.drift_sync_task
    if drift_task is not None:
        drift_task.cancel()
        with suppress(asyncio.CancelledError):
            await drift_task
        app.state.drift_sync_task = None
    await redis_client.close()
    logger.info("Closed Redis connection.")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(server.router, prefix="/api/servers", tags=["Server Management"])
app.include_router(store.router, prefix="/api/store", tags=["Resource Store"])
app.include_router(ticket.router, prefix="/api/tickets", tags=["Support Tickets"])
app.include_router(afk.router, prefix="/api/afk", tags=["AFK Earnings"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing & SSLCommerz"])
app.include_router(security.router, prefix="/api/security", tags=["Security Checks"])
app.include_router(referrals.router, prefix="/api/referrals", tags=["Referrals"])
app.include_router(account.router, prefix="/api/account", tags=["Account"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(earn.router, prefix="/api/earn", tags=["Earnings"])
app.include_router(images.router, prefix="/api/images", tags=["Image Hosting"])

os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.IMAGE_UPLOAD_DIR), name="uploads")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Flux Client Backend"}
