from __future__ import annotations

import logging
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, Ticket, TicketMessage, User
from app.schemas.schemas import (
    SupportPinVerificationRequest,
    TicketCreate,
    TicketOut,
    TicketReplyCreate,
)
from app.services.auth_utils import get_current_admin, get_current_user
from app.services.email import send_transactional_email

logger = logging.getLogger(__name__)
router = APIRouter()


def _generate_support_pin() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _get_ticket_or_404(db: Session, ticket_id: UUID, user: User | None = None, admin: bool = False) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if user is not None and not admin and ticket.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ticket


@router.get("", response_model=list[TicketOut])
def list_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Ticket).filter(Ticket.user_id == current_user.id).order_by(Ticket.created_at.desc()).all()


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    support_pin = _generate_support_pin()
    ticket = Ticket(
        user_id=current_user.id,
        subject=payload.subject.strip(),
        department=payload.department.strip().lower(),
        status="open",
        support_pin=support_pin,
    )
    db.add(ticket)
    db.flush()

    first_message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_type="user",
        message=payload.message.strip(),
    )
    db.add(first_message)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="ticket_create",
            details={"ticket_id": str(ticket.id), "department": ticket.department},
        )
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = _get_ticket_or_404(db, ticket_id, user=current_user)
    return ticket


@router.post("/{ticket_id}/verify-pin")
def verify_support_pin(
    ticket_id: UUID,
    payload: SupportPinVerificationRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ticket = _get_ticket_or_404(db, ticket_id, admin=True, user=current_admin)
    verified = ticket.support_pin == payload.support_pin.strip()
    if not verified:
        raise HTTPException(status_code=403, detail="Invalid support PIN")
    return {"verified": True, "ticket_id": str(ticket.id)}


@router.post("/{ticket_id}/messages", response_model=TicketOut)
async def reply_to_ticket(
    ticket_id: UUID,
    payload: TicketReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = _get_ticket_or_404(db, ticket_id, user=current_user, admin=current_user.is_admin)

    if current_user.is_admin and ticket.support_pin and payload.support_pin != ticket.support_pin:
        raise HTTPException(status_code=403, detail="Support PIN verification failed")

    sender_type = "admin" if current_user.is_admin and ticket.user_id != current_user.id else "user"
    message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_type=sender_type,
        message=payload.message.strip(),
    )
    db.add(message)
    ticket.status = "replied" if sender_type == "admin" else "open"

    if sender_type == "admin" and ticket.user and ticket.user.email:
        try:
            await send_transactional_email(
                to_email=ticket.user.email,
                subject=f"New reply on your ticket: {ticket.subject}",
                template_name="ticket_reply.html",
                context={
                    "username": ticket.user.username,
                    "subject": ticket.subject,
                    "reply_message": payload.message.strip(),
                    "dash_url": settings.FRONTEND_URL,
                },
            )
        except Exception as exc:
            logger.warning("Failed to send ticket reply email for ticket %s: %s", ticket.id, exc)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="ticket_reply",
            details={"ticket_id": str(ticket.id), "sender_type": sender_type},
        )
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/close", response_model=TicketOut)
def close_ticket(
    ticket_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ticket = _get_ticket_or_404(db, ticket_id, admin=True, user=current_admin)
    ticket.status = "closed"
    db.add(
        AuditLog(
            user_id=current_admin.id,
            action="ticket_close",
            details={"ticket_id": str(ticket.id)},
        )
    )
    db.commit()
    db.refresh(ticket)
    return ticket
