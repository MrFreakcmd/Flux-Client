from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.models import AuditLog, Server
from app.services.calagopus import calagopus_client

logger = logging.getLogger(__name__)


def _collect_server_lists(payload):
    if isinstance(payload, list):
        if not payload:
            return []
        if all(isinstance(item, dict) for item in payload):
            return payload
        return []

    if isinstance(payload, dict):
        for value in payload.values():
            collected = _collect_server_lists(value)
            if collected:
                return collected
    return []


def _extract_remote_server_uuids(payload) -> set[UUID]:
    uuids: set[UUID] = set()
    for item in _collect_server_lists(payload):
        raw_uuid = item.get("uuid") if isinstance(item, dict) else None
        if not raw_uuid:
            continue
        try:
            uuids.add(UUID(str(raw_uuid)))
        except ValueError:
            continue
    return uuids


async def run_drift_sync_once() -> None:
    db: Session = SessionLocal()
    try:
        response = await calagopus_client.list_servers(page=1, per_page=500)
        if response.status_code != 200:
            logger.warning("Drift sync skipped because Calagopus returned %s", response.status_code)
            return

        payload = response.json()
        remote_uuids = _extract_remote_server_uuids(payload)
        local_servers = db.query(Server).all()
        local_uuid_map = {server.calagopus_uuid: server for server in local_servers}

        now = datetime.now(timezone.utc)
        changed = False

        for server in local_servers:
            if server.calagopus_uuid not in remote_uuids and not server.is_suspended:
                server.is_suspended = True
                changed = True
                db.add(
                    AuditLog(
                        user_id=server.user_id,
                        action="drift_sync_missing_server",
                        details={
                            "server_uuid": str(server.calagopus_uuid),
                            "detected_at": now.isoformat(),
                        },
                    )
                )

        for remote_uuid in remote_uuids:
            if remote_uuid not in local_uuid_map:
                db.add(
                    AuditLog(
                        action="drift_sync_orphan_server",
                        details={
                            "server_uuid": str(remote_uuid),
                            "detected_at": now.isoformat(),
                        },
                    )
                )

        if changed:
            db.commit()
        else:
            db.rollback()
    except Exception as exc:
        logger.exception("Drift sync failed: %s", exc)
        db.rollback()
    finally:
        db.close()


async def run_drift_sync_loop() -> None:
    interval = max(60, int(settings.DRIFT_SYNC_INTERVAL_SECONDS))
    while True:
        await run_drift_sync_once()
        await asyncio.sleep(interval)
