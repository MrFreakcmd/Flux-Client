from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models.models import SystemSetting, User
from app.services.auth_utils import get_current_user, get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()

# Default application settings
DEFAULT_SETTINGS = {
    "app_name": "Flux Client",
    "logo_url": "/src/assets/image/Flux-Client-icon-48x48-BR.png",
    "favicon_url": "/src/assets/image/Flux-Client-icon-48x48-BR.png",
    "primary_color": "#64f0c8",
    "secondary_color": "#7d8cff",
    "footer_text": "© 2026 Flux Client. All rights reserved.",
    "support_email": "support@example.com",
}


def get_all_settings(db: Session) -> dict:
    """Retrieve all application settings from database, with defaults as fallback."""
    settings = {}
    for key in DEFAULT_SETTINGS.keys():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            settings[key] = setting.value
        else:
            settings[key] = DEFAULT_SETTINGS[key]
    return settings


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Get all application settings (public endpoint - anyone can view)."""
    return get_all_settings(db)


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a specific application setting."""
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        return {key: setting.value}
    return {key: DEFAULT_SETTINGS[key]}


@router.put("/{key}")
def update_setting(
    key: str,
    body: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a specific application setting (admin only)."""
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail="Invalid setting key")

    value = body.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="Value is required")

    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = SystemSetting(key=key, value=value)
        db.add(setting)

    db.commit()
    logger.info(f"Admin {current_user.username} updated setting {key}")

    return {key: value}


@router.put("")
def update_settings(
    body: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update multiple application settings at once (admin only)."""
    updated = {}

    for key, value in body.items():
        if key not in DEFAULT_SETTINGS:
            raise HTTPException(status_code=400, detail=f"Invalid setting key: {key}")

        if value is None:
            raise HTTPException(status_code=400, detail=f"Value required for {key}")

        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = SystemSetting(key=key, value=value)
            db.add(setting)

        updated[key] = value

    db.commit()
    logger.info(f"Admin {current_user.username} updated {len(updated)} settings")

    return updated


@router.post("/reset/{key}")
def reset_setting(
    key: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Reset a setting to its default value (admin only)."""
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        db.delete(setting)

    db.commit()
    logger.info(f"Admin {current_user.username} reset setting {key}")

    return {key: DEFAULT_SETTINGS[key], "message": "Setting reset to default"}
