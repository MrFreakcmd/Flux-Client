import logging
from typing import Iterable

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import SecurityCheckOut, SecurityCheckRequest
from app.services.auth_utils import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()


def _format_duplicate_account(user: User) -> str:
    return f"{user.username}:{user.discord_id}"


def _query_duplicate_accounts(db: Session, client_ip: str, discord_id: str | None = None) -> list[str]:
    query = db.query(User).join(AuditLog, AuditLog.user_id == User.id).filter(AuditLog.ip_address == client_ip)
    if discord_id:
        query = query.filter(User.discord_id != discord_id)
    duplicates = query.distinct().all()
    return [_format_duplicate_account(user) for user in duplicates]


async def _query_vpn_api(client_ip: str) -> tuple[bool, bool, bool]:
    if not settings.VPNAPI_KEY:
        return False, False, False

    url = f"https://vpnapi.io/api/{client_ip}?key={settings.VPNAPI_KEY}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=5)
        if resp.status_code != 200:
            logger.warning("VPN API lookup failed for %s: %s", client_ip, resp.text)
            return False, False, False
        security = resp.json().get("security", {})
        return (
            bool(security.get("vpn", False)),
            bool(security.get("proxy", False)),
            bool(security.get("tor", False)),
        )


async def run_login_security_checks(
    db: Session,
    client_ip: str,
    discord_id: str | None = None,
    user_agent: str | None = None,
) -> SecurityCheckOut:
    vpn_detected, proxy_detected, tor_detected = await _query_vpn_api(client_ip)
    duplicate_accounts = _query_duplicate_accounts(db, client_ip, discord_id)
    notes: list[str] = []

    if duplicate_accounts:
        notes.append("Possible alt-account activity detected from this IP.")

    if vpn_detected or proxy_detected or tor_detected:
        notes.append("VPN/proxy signal detected.")
        logger.warning(
            "Blocking login from %s due to VPN/proxy detection. discord_id=%s user_agent=%s",
            client_ip,
            discord_id,
            user_agent,
        )
        raise HTTPException(status_code=403, detail="VPN/Proxy connections are not allowed on this dashboard")

    if duplicate_accounts:
        db.add(
            AuditLog(
                action="security_alt_account_flag",
                ip_address=client_ip,
                user_agent=user_agent,
                details={"duplicate_accounts": duplicate_accounts, "discord_id": discord_id},
            )
        )
        db.flush()

    return SecurityCheckOut(
        client_ip=client_ip,
        vpn_detected=vpn_detected,
        proxy_detected=proxy_detected,
        tor_detected=tor_detected,
        duplicate_accounts=duplicate_accounts,
        blocked=False,
        notes=notes,
    )


@router.post("/check-login", response_model=SecurityCheckOut)
async def check_login_security(
    payload: SecurityCheckRequest,
    db: Session = Depends(get_db),
):
    client_ip = payload.client_ip or "127.0.0.1"
    report = await run_login_security_checks(
        db=db,
        client_ip=client_ip,
        discord_id=payload.discord_id,
        user_agent=payload.user_agent,
    )
    db.commit()
    return report


@router.get("/ip/{client_ip}", response_model=SecurityCheckOut)
async def inspect_ip_security(
    client_ip: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _ = current_admin
    return await run_login_security_checks(db=db, client_ip=client_ip)
