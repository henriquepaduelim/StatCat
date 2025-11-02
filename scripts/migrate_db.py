#!/usr/bin/env python3
"""Script to apply database migrations and fix enum values."""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import init_db

if __name__ == "__main__":
    print("Applying database migrations...")
    try:
        init_db()
        print("Migrations applied successfully!")
    except Exception as e:
        print(f"Error applying migrations: {e}")
        sys.exit(1)
