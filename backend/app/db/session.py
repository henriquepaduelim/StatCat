from collections.abc import Generator
import ipaddress
import logging
import socket
from typing import Any

from sqlalchemy import event
from sqlalchemy.engine.url import make_url
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.db.seed import seed_database


logger = logging.getLogger(__name__)


def _build_connect_args() -> dict[str, Any]:
    """Optionally force PostgreSQL connections to use IPv4."""

    if settings.DATABASE_URL.startswith("sqlite"):
        return {}

    if settings.DATABASE_HOSTADDR:
        logger.info("Using DATABASE_HOSTADDR override for DB connection")
        return {"hostaddr": settings.DATABASE_HOSTADDR}

    if not settings.DATABASE_FORCE_IPV4:
        return {}

    parsed = make_url(settings.DATABASE_URL)
    host = parsed.host
    if not host:
        return {}

    try:
        ipaddress.ip_address(host)
        return {}
    except ValueError:
        pass

    try:
        ipv4_info = socket.getaddrinfo(
            host,
            parsed.port or 0,
            socket.AF_INET,
            socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:  # pragma: no cover - depends on deployment DNS
        logger.warning("Unable to resolve IPv4 for %s: %s", host, exc)
        return {}

    ipv4_address = ipv4_info[0][4][0]
    logger.info("Resolved %s to IPv4 %s", host, ipv4_address)
    return {"hostaddr": ipv4_address}


connect_args = _build_connect_args()

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
)

if settings.DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)
    if settings.AUTO_SEED_DATABASE:
        with Session(engine) as session:
            seed_database(session)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""

    with Session(engine) as session:
        yield session
