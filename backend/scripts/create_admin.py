"""
Utility to create an admin user in the target database.

Usage:
    python scripts/create_admin.py --email admin@statcat.com --password 'AdM123'

Reads DB settings from the same environment variables used by the app.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure the project root (backend/) is on sys.path so "app" imports work
sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select

from app.db.session import engine
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_admin(email: str, password: str, full_name: str = "StatCat Admin") -> None:
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            print(f"User {email} already exists; no changes made.")
            return

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Admin created: {user.email} (id={user.id})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an admin user.")
    parser.add_argument("--email", required=True, help="Admin email (e.g., admin@statcat.com)")
    parser.add_argument("--password", required=True, help="Plaintext password for the admin")
    parser.add_argument("--full-name", default="StatCat Admin", help="Full name for the admin user")
    args = parser.parse_args()

    create_admin(email=args.email, password=args.password, full_name=args.full_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
