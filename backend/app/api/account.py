from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ApiKey, AuditLog, CoinLedger, User
from app.schemas.schemas import AccountUpdateRequest, ApiKeyCreateRequest, UserOut
from app.services.auth_utils import get_current_user

router = APIRouter()


def _api_key_payload(api_key: ApiKey) -> dict:
    return {
        "id": str(api_key.id),
        "name": api_key.name,
        "prefix": api_key.prefix,
        "created_at": api_key.created_at,
        "last_used_at": api_key.last_used_at,
        "revoked_at": api_key.revoked_at,
    }


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: AccountUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.username is not None:
        current_user.username = payload.username.strip()
    if payload.avatar is not None:
        current_user.avatar = payload.avatar.strip() or None

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="account_profile_update",
            details={"updated_fields": list(payload.model_dump(exclude_none=True).keys())},
        )
    )
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/activity")
def read_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ledger_entries = (
        db.query(CoinLedger)
        .filter(CoinLedger.user_id == current_user.id)
        .order_by(desc(CoinLedger.created_at))
        .limit(25)
        .all()
    )
    audit_entries = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(desc(AuditLog.created_at))
        .limit(25)
        .all()
    )

    return {
        "ledger": [
            {
                "id": entry.id,
                "amount": str(entry.amount),
                "running_balance": str(entry.running_balance),
                "type": entry.type,
                "description": entry.description,
                "reference_id": entry.reference_id,
                "created_at": entry.created_at,
            }
            for entry in ledger_entries
        ],
        "audit": [
            {
                "id": entry.id,
                "action": entry.action,
                "ip_address": entry.ip_address,
                "details": entry.details,
                "created_at": entry.created_at,
            }
            for entry in audit_entries
        ],
    }


@router.get("/linked-accounts")
def linked_accounts(current_user: User = Depends(get_current_user)):
    return {
        "accounts": [
            {
                "provider": "discord",
                "connected": True,
                "identifier": current_user.discord_id,
                "username": current_user.username,
                "email": current_user.email,
            },
            {
                "provider": "calagopus",
                "connected": current_user.calagopus_uuid is not None,
                "identifier": str(current_user.calagopus_uuid) if current_user.calagopus_uuid else None,
                "username": current_user.username,
                "email": current_user.email,
            },
        ]
    }


@router.get("/api-keys")
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == current_user.id)
        .order_by(desc(ApiKey.created_at))
        .all()
    )
    return {"api_keys": [_api_key_payload(key) for key in keys]}


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw_key = f"flux_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    prefix = f"{raw_key[:10]}..."

    api_key = ApiKey(
        user_id=current_user.id,
        name=payload.name.strip(),
        key_hash=key_hash,
        prefix=prefix,
    )
    db.add(api_key)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="api_key_create",
            details={"name": api_key.name, "prefix": prefix},
        )
    )
    db.commit()
    db.refresh(api_key)
    return {"api_key": _api_key_payload(api_key), "secret": raw_key}


@router.delete("/api-keys/{api_key_id}")
def revoke_api_key(
    api_key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        parsed_key_id = uuid.UUID(api_key_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="API key not found") from None

    api_key = db.query(ApiKey).filter(ApiKey.id == parsed_key_id, ApiKey.user_id == current_user.id).first()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.revoked_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="api_key_revoke",
            details={"api_key_id": str(api_key.id), "prefix": api_key.prefix},
        )
    )
    db.commit()
    return {"status": "revoked", "api_key_id": str(api_key.id)}
