from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Announcement
from app.services.auth_utils import get_current_user

router = APIRouter()


@router.get("")
def list_announcements(
    _current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    announcements = (
        db.query(Announcement)
        .filter(Announcement.is_active.is_(True))
        .order_by(desc(Announcement.created_at))
        .limit(20)
        .all()
    )
    return {
        "announcements": [
            {
                "id": str(item.id),
                "title": item.title,
                "content": item.content,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in announcements
        ]
    }
