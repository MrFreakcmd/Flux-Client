"""Image hosting and management API with secure URL generation."""
from __future__ import annotations

import os
import uuid
import hmac
import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import AuditLog, UploadedImage, User, UserImageSettings
from app.schemas.schemas import ImageSettingsRequest
from app.services.auth_utils import get_current_user

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


def _generate_image_token(image_id: str) -> str:
    """Generate HMAC-based token for secure image access.

    Never expose user IDs in URLs. Generate a token that can be
    verified without database lookup (constant-time comparison).
    """
    message = image_id.encode("utf-8")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        message,
        hashlib.sha256
    ).hexdigest()
    return signature[:16]  # Use first 16 chars of hash


def _verify_image_token(image_id: str, provided_token: str) -> bool:
    """Verify image token using constant-time comparison.

    Prevents timing attacks on token verification.
    """
    expected_token = _generate_image_token(image_id)
    return hmac.compare_digest(expected_token, provided_token)


def _upload_root() -> str:
    root = settings.IMAGE_UPLOAD_DIR
    os.makedirs(root, exist_ok=True)
    return root


def _settings_for_user(db: Session, user: User) -> UserImageSettings:
    image_settings = db.query(UserImageSettings).filter(
        UserImageSettings.user_id == user.id
    ).first()
    if image_settings is None:
        image_settings = UserImageSettings(user_id=user.id)
        db.add(image_settings)
        db.flush()
    return image_settings


def _image_payload(image: UploadedImage) -> dict:
    """Generate image response with secure token-based URL."""
    token = _generate_image_token(str(image.id))
    # URL format: /uploads/{token}/{image_id}/{filename}
    # Prevents user enumeration (token required to access)
    secure_url = (
        f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}/uploads/"
        f"{token}/{image.id}/{image.filename}"
    )
    return {
        "id": str(image.id),
        "filename": image.filename,
        "original_filename": image.original_filename,
        "content_type": image.content_type,
        "size_bytes": image.size_bytes,
        "public_url": secure_url,
        "created_at": image.created_at,
    }


@router.get("/settings")
def read_image_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image_settings = _settings_for_user(db, current_user)
    db.commit()
    return {
        "enabled": image_settings.enabled,
        "embed_enabled": image_settings.embed_enabled,
        "embed_title": image_settings.embed_title,
        "embed_description": image_settings.embed_description,
        "embed_color": image_settings.embed_color,
        "max_upload_mb": settings.IMAGE_UPLOAD_MAX_MB,
        "allowed_types": sorted(ALLOWED_IMAGE_TYPES),
    }


@router.put("/settings")
def update_image_settings(
    payload: ImageSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image_settings = _settings_for_user(db, current_user)
    image_settings.enabled = payload.enabled
    image_settings.embed_enabled = payload.embed_enabled
    image_settings.embed_title = payload.embed_title
    image_settings.embed_description = payload.embed_description
    image_settings.embed_color = payload.embed_color
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="image_settings_update",
            details=payload.model_dump(),
        )
    )
    db.commit()
    return read_image_settings(current_user=current_user, db=db)


@router.get("")
def list_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    images = (
        db.query(UploadedImage)
        .filter(UploadedImage.user_id == current_user.id)
        .order_by(desc(UploadedImage.created_at))
        .limit(100)
        .all()
    )
    return {"images": [_image_payload(image) for image in images]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image file."""
    image_settings = _settings_for_user(db, current_user)
    if not image_settings.enabled:
        raise HTTPException(
            status_code=403,
            detail="Image hosting is disabled for your account"
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    raw = await file.read()
    max_bytes = settings.IMAGE_UPLOAD_MAX_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image exceeds {settings.IMAGE_UPLOAD_MAX_MB} MB"
        )

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        extension = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/gif": ".gif",
            "image/webp": ".webp",
        }[file.content_type]

    image_id = uuid.uuid4()
    filename = f"{image_id}{extension}"
    # Store in a directory keyed by image ID, not user ID (prevents enumeration)
    storage_dir = os.path.join(_upload_root(), str(image_id))
    os.makedirs(storage_dir, exist_ok=True)
    storage_path = os.path.join(storage_dir, filename)

    with open(storage_path, "wb") as target:
        target.write(raw)

    # Note: public_url is generated on-the-fly in _image_payload
    image = UploadedImage(
        id=image_id,
        user_id=current_user.id,
        filename=filename,
        original_filename=file.filename or filename,
        content_type=file.content_type,
        size_bytes=len(raw),
        storage_path=storage_path,
        public_url=None,  # Generated at request time
    )
    db.add(image)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="image_upload",
            details={
                "image_id": str(image_id),
                "size_bytes": len(raw),
                "content_type": file.content_type
            },
        )
    )
    db.commit()
    db.refresh(image)
    return {"image": _image_payload(image)}


@router.delete("/{image_id}")
def delete_image(
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an image owned by the current user."""
    image = db.query(UploadedImage).filter(
        UploadedImage.id == image_id, UploadedImage.user_id == current_user.id
    ).first()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    if os.path.exists(image.storage_path):
        os.remove(image.storage_path)
    db.delete(image)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="image_delete",
            details={"image_id": str(image_id)},
        )
    )
    db.commit()
    return {"status": "deleted", "image_id": str(image_id)}


@router.get("/{token}/{image_id}/{filename}")
async def serve_image(
    token: str,
    image_id: uuid.UUID,
    filename: str,
    db: Session = Depends(get_db),
):
    """Serve image file with token verification to prevent user enumeration.

    Token is HMAC-based and verified without database lookup.
    Prevents direct access to images by ID; requires valid token.
    """
    # Verify token matches image_id (constant-time comparison)
    if not _verify_image_token(str(image_id), token):
        raise HTTPException(status_code=403, detail="Invalid or missing token")

    # Verify image exists in database (security: confirm ownership exists)
    image = db.query(UploadedImage).filter(
        UploadedImage.id == image_id
    ).first()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    # Verify filename matches (prevent directory traversal)
    if image.filename != filename:
        raise HTTPException(status_code=404, detail="Invalid filename")

    # Verify file exists on disk
    if not os.path.exists(image.storage_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Serve the file
    from fastapi.responses import FileResponse
    return FileResponse(
        path=image.storage_path,
        media_type=image.content_type,
        filename=image.original_filename,
    )
