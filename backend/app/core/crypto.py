"""Utility helpers for encrypting and decrypting sensitive payload segments."""

from __future__ import annotations

from base64 import urlsafe_b64encode
from functools import lru_cache
from hashlib import sha256

from cryptography.fernet import Fernet

from app.core.config import settings


@lru_cache
def _get_cipher() -> Fernet:
    """Create a Fernet cipher derived from the application secret key."""

    digest = sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    key = urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_text(value: str | None) -> str | None:
    """Encrypt a plain-text value returning a URL-safe token."""

    if not value:
        return None
    cipher = _get_cipher()
    token = cipher.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_text(token: str | None) -> str | None:
    """Decrypt a token produced by :func:`encrypt_text`."""

    if not token:
        return None
    cipher = _get_cipher()
    value = cipher.decrypt(token.encode("utf-8"))
    return value.decode("utf-8")
