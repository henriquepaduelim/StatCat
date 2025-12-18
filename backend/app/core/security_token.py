from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from app.core.config import settings


class SecurityTokenManager:
    """Manages secure, timed tokens for actions like RSVP."""

    def __init__(self, secret_key: str):
        self.serializer = URLSafeTimedSerializer(secret_key)

    def generate_token(self, data: dict, salt: str) -> str:
        """Generates a secure, salted token."""
        return self.serializer.dumps(data, salt=salt)

    def verify_token(
        self, token: str, salt: str, max_age_seconds: int = 30 * 24 * 60 * 60
    ) -> dict | None:
        """
        Verifies a token.

        Args:
            max_age_seconds: The maximum age of the token in seconds. Defaults to 30 days.
        """
        try:
            return self.serializer.loads(token, salt=salt, max_age=max_age_seconds)
        except (SignatureExpired, BadTimeSignature):
            return None


# Singleton instance using the application's secret key
security_token_manager = SecurityTokenManager(settings.SECRET_KEY)
