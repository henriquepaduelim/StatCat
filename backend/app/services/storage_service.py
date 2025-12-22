import logging
import mimetypes
import uuid
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageServiceError(RuntimeError):
    """Raised when Supabase storage upload fails."""


class StorageService:
    """Thin client for Supabase Storage uploads using service-role key."""

    def __init__(self) -> None:
        self.base_url = (settings.SUPABASE_URL or "").rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET or ""
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY or ""

        if not (self.base_url and self.bucket and self.service_key):
            logger.warning("Supabase Storage is not fully configured.")

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.bucket and self.service_key)

    def build_public_url(self, key: str) -> str:
        """Return the public URL for an object key (MVP uses public buckets)."""
        return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{key}"

    async def upload_bytes(self, key: str, data: bytes, content_type: str) -> str:
        """Upload bytes to Supabase Storage and return the public URL."""
        if not self.is_configured:
            raise StorageServiceError("Supabase Storage not configured")

        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{key}"
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, content=data, headers=headers)
        if resp.status_code >= 300:
            raise StorageServiceError(
                f"Failed to upload to Supabase Storage ({resp.status_code}): {resp.text}"
            )

        return self.build_public_url(key)


storage_service = StorageService()


def _safe_ext(filename: Optional[str], fallback: str = "") -> str:
    ext = ""
    if filename:
        ext = mimetypes.guess_extension(mimetypes.guess_type(filename)[0] or "") or ""
        suffix = filename.split(".")[-1] if "." in filename else ""
        if suffix:
            ext = f".{suffix.lower()}"
    return ext or fallback


def athlete_photo_key(athlete_id: int, ext: str) -> str:
    return f"athletes/{athlete_id}/profile/{uuid.uuid4()}{ext}"


def user_photo_key(user_id: int, ext: str) -> str:
    return f"users/{user_id}/profile/{uuid.uuid4()}{ext}"


def athlete_document_key(athlete_id: int, label: str, ext: str) -> str:
    safe_label = label.strip().replace("/", "_").replace("\\", "_") or "document"
    return f"athletes/{athlete_id}/documents/{safe_label}/{uuid.uuid4()}{ext}"
 

def team_post_media_key(team_id: int, ext: str) -> str:
    return f"team_posts/{team_id}/{uuid.uuid4()}{ext}"
