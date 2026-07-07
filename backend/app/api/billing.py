from __future__ import annotations

import hashlib
import json
import logging
import uuid
from decimal import Decimal
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import BillingSessionOut, BillingSessionRequest, BillingWebhookPayload
from app.services.auth_utils import get_current_user
from app.services.ledger import mutate_user_coins
from app.services.redis_service import acquire_lock, redis_client

logger = logging.getLogger(__name__)
router = APIRouter()

PENDING_KEY_PREFIX = "billing:pending:"
PROCESSED_KEY_PREFIX = "billing:processed:"


def _sslcommerz_base_url() -> str:
    return "https://sandbox.sslcommerz.com" if settings.SSLCOMMERZ_IS_SANDBOX else "https://securepay.sslcommerz.com"


def _initiation_url() -> str:
    return f"{_sslcommerz_base_url()}/gwprocess/v4/api.php"


def _validation_url() -> str:
    return f"{_sslcommerz_base_url()}/validator/api/validationserverAPI.php"


def _pending_key(tran_id: str) -> str:
    return f"{PENDING_KEY_PREFIX}{tran_id}"


def _processed_key(tran_id: str) -> str:
    return f"{PROCESSED_KEY_PREFIX}{tran_id}"


def _md5(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest()


def _validate_verify_signature(payload: dict[str, Any]) -> bool:
    """Validate SSLCommerz webhook signature.

    Rejects webhooks with missing signature or key.
    """
    verify_sign = payload.get("verify_sign")
    verify_key = payload.get("verify_key")
    if not verify_sign or not verify_key:
        return False

    keys = [key.strip() for key in verify_key.split(",") if key.strip()]
    keys.sort()
    parts = []
    for key in keys:
        parts.append(f"{key}={payload.get(key, '')}")
    parts.append(f"store_passwd={_md5(settings.SSLCOMMERZ_STORE_PASSWORD)}")
    serialised = "&".join(parts)
    expected_sign = _md5(serialised)
    return expected_sign == verify_sign


async def _store_pending_payment(
    tran_id: str,
    user: User,
    amount: Decimal,
    currency: str,
    description: str | None,
) -> None:
    payload = {
        "user_id": str(user.id),
        "amount": str(amount),
        "currency": currency,
        "description": description or "Wallet top up",
    }
    await redis_client.set(_pending_key(tran_id), json.dumps(payload), ex=60 * 60 * 24)


async def _load_pending_payment(tran_id: str) -> dict[str, Any] | None:
    raw = await redis_client.get(_pending_key(tran_id))
    if not raw:
        return None
    return json.loads(raw)


async def _validate_transaction_with_sslcommerz(val_id: str) -> dict[str, Any]:
    if not settings.SSLCOMMERZ_STORE_ID or not settings.SSLCOMMERZ_STORE_PASSWORD:
        raise HTTPException(status_code=500, detail="SSLCommerz credentials are not configured")

    params = {
        "val_id": val_id,
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
        "format": "json",
        "v": 1,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(_validation_url(), params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="SSLCommerz validation request failed")
        return resp.json()


@router.post("/initiate", response_model=BillingSessionOut)
async def initiate_payment_session(
    payload: BillingSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.SSLCOMMERZ_STORE_ID or not settings.SSLCOMMERZ_STORE_PASSWORD:
        raise HTTPException(status_code=400, detail="SSLCommerz credentials are not configured")

    tran_id = f"FX{uuid.uuid4().hex[:24].upper()}"
    amount = payload.amount.quantize(Decimal("0.01"))
    success_url = f"{settings.BACKEND_PUBLIC_URL}/api/billing/success?tran_id={tran_id}"
    fail_url = f"{settings.BACKEND_PUBLIC_URL}/api/billing/fail?tran_id={tran_id}"
    cancel_url = f"{settings.BACKEND_PUBLIC_URL}/api/billing/cancel?tran_id={tran_id}"

    post_data = {
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
        "total_amount": f"{amount:.2f}",
        "currency": payload.currency,
        "tran_id": tran_id,
        "product_category": payload.product_category,
        "success_url": success_url,
        "fail_url": fail_url,
        "cancel_url": cancel_url,
        "ipn_url": f"{settings.BACKEND_PUBLIC_URL}/api/billing/webhook",
        "cus_name": current_user.username,
        "cus_email": current_user.email,
        "cus_add1": "Dhaka",
        "cus_city": "Dhaka",
        "cus_country": "Bangladesh",
        "cus_phone": "0000000000",
        "shipping_method": "NO",
        "product_name": payload.description or "Wallet top up",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(_initiation_url(), data=post_data)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to initialize SSLCommerz session")
        gateway_payload = resp.json()

    gateway_url = gateway_payload.get("GatewayPageURL")
    if not gateway_url:
        raise HTTPException(status_code=400, detail="SSLCommerz did not return a payment URL")

    await _store_pending_payment(
        tran_id=tran_id,
        user=current_user,
        amount=amount,
        currency=payload.currency,
        description=payload.description,
    )

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="billing_session_initiated",
            details={
                "tran_id": tran_id,
                "amount": float(amount),
                "currency": payload.currency,
                "gateway_url": gateway_url,
            },
        )
    )
    db.commit()

    return BillingSessionOut(
        tran_id=tran_id,
        gateway_url=gateway_url,
        amount=amount,
        currency=payload.currency,
        description=payload.description,
    )


@router.post("/webhook")
async def billing_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")
    payload: dict[str, Any]
    if "application/json" in content_type:
        payload = await request.json()
    else:
        form = await request.form()
        payload = dict(form.items())

    if not _validate_verify_signature(payload):
        raise HTTPException(status_code=403, detail="Invalid SSLCommerz signature")

    webhook_payload = BillingWebhookPayload.model_validate(payload)
    tran_id = webhook_payload.tran_id
    val_id = webhook_payload.val_id

    if not tran_id:
        raise HTTPException(status_code=400, detail="Missing transaction ID")
    if not val_id:
        raise HTTPException(status_code=400, detail="Missing validation ID")

    async with acquire_lock(f"billing:{tran_id}"):
        processed = await redis_client.get(_processed_key(tran_id))
        if processed:
            return {"status": "ignored", "reason": "transaction already processed", "tran_id": tran_id}

        pending = await _load_pending_payment(tran_id)
        if pending is None:
            return {"status": "ignored", "reason": "no pending payment found", "tran_id": tran_id}

        validation = await _validate_transaction_with_sslcommerz(val_id)
        validation_status = str(validation.get("status", "")).upper()
        if validation_status not in {"VALID", "VALIDATED"}:
            raise HTTPException(status_code=400, detail=f"Transaction validation failed: {validation_status or 'UNKNOWN'}")

        validated_amount = Decimal(str(validation.get("amount", pending["amount"])))
        expected_amount = Decimal(str(pending["amount"]))
        if validated_amount != expected_amount:
            raise HTTPException(status_code=400, detail="Validated amount does not match the pending payment")

        user_id = pending["user_id"]
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found for pending payment")

        credited_user = await mutate_user_coins(
            db=db,
            user=user,
            amount=expected_amount,
            ledger_type="topup",
            description=pending.get("description") or "Wallet top up",
            reference_id=tran_id,
        )
        db.add(
            AuditLog(
                user_id=user.id,
                action="billing_payment_confirmed",
                details={
                    "tran_id": tran_id,
                    "val_id": val_id,
                    "amount": float(expected_amount),
                    "currency": pending.get("currency"),
                    "validation_status": validation_status,
                },
            )
        )
        db.commit()

        await redis_client.set(_processed_key(tran_id), "1", ex=60 * 60 * 24 * 7)
        await redis_client.delete(_pending_key(tran_id))

        return {
            "status": "success",
            "tran_id": tran_id,
            "credited_balance": str(credited_user.coins),
        }


@router.get("/success")
def billing_success(tran_id: str | None = None):
    target = f"{settings.FRONTEND_URL}/billing?status=success"
    if tran_id:
        target = f"{target}&tran_id={tran_id}"
    return RedirectResponse(target)


@router.get("/fail")
def billing_fail(tran_id: str | None = None):
    target = f"{settings.FRONTEND_URL}/billing?status=fail"
    if tran_id:
        target = f"{target}&tran_id={tran_id}"
    return RedirectResponse(target)


@router.get("/cancel")
def billing_cancel(tran_id: str | None = None):
    target = f"{settings.FRONTEND_URL}/billing?status=cancel"
    if tran_id:
        target = f"{target}&tran_id={tran_id}"
    return RedirectResponse(target)
