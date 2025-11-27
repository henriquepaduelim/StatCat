"""Utility helpers for encrypting and decrypting sensitive payload segments."""

from __future__ import annotations

from base64 import urlsafe_b64encode
from functools import lru_cache
from hashlib import sha256
from typing import Iterable

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _derive_key(raw: str) -> bytes:
    """Derive a Fernet-compatible key from a raw secret."""

    digest = sha256(raw.encode("utf-8")).digest()
    return urlsafe_b64encode(digest)


@lru_cache
def _get_ciphers() -> list[Fernet]:
    """Return ciphers for current and previous keys to support rotation."""

    keys: list[str] = []
    if settings.ENCRYPTION_KEY_CURRENT:
        keys.append(settings.ENCRYPTION_KEY_CURRENT)
    else:
        keys.append(settings.SECRET_KEY)  # fallback to legacy behavior
    if settings.ENCRYPTION_KEY_PREVIOUS:
        keys.append(settings.ENCRYPTION_KEY_PREVIOUS)

    return [Fernet(_derive_key(k)) for k in keys]


def encrypt_text(value: str | None) -> str | None:
    """Encrypt a plain-text value returning a URL-safe token."""

    if not value:
        return None
    cipher = _get_ciphers()[0]
    token = cipher.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_text(token: str | None) -> str | None:
    """Decrypt a token produced by :func:`encrypt_text` (supports key rotation)."""

    if not token:
        return None

    for cipher in _get_ciphers():
        try:
            value = cipher.decrypt(token.encode("utf-8"))
            return value.decode("utf-8")
        except InvalidToken:
            continue
    raise InvalidToken("Unable to decrypt token with provided keys")
