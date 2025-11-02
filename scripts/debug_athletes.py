#!/usr/bin/env python3
"""Script to debug athlete user status."""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlmodel import Session, select
from app.db.session import get_engine
from app.models.user import User, UserRole, AthleteStatus

def debug_athlete_users():
    """Debug all athlete users and their status."""
    engine = get_engine()
    
    with Session(engine) as session:
        # Find all athlete users
        athletes = session.exec(
            select(User).where(User.role == UserRole.ATHLETE)
        ).all()
        
        print(f"Found {len(athletes)} athlete users:")
        print("=" * 50)
        
        for athlete in athletes:
            print(f"ID: {athlete.id}")
            print(f"Email: {athlete.email}")
            print(f"Full Name: {athlete.full_name}")
            print(f"Role: {athlete.role}")
            print(f"Athlete ID: {athlete.athlete_id}")
            print(f"Athlete Status: {athlete.athlete_status}")
            print(f"Athlete Status Type: {type(athlete.athlete_status)}")
            if hasattr(athlete.athlete_status, 'value'):
                print(f"Athlete Status Value: {athlete.athlete_status.value}")
            print(f"Rejection Reason: {athlete.rejection_reason}")
            print(f"Is Active: {athlete.is_active}")
            print("-" * 30)

if __name__ == "__main__":
    print("Debugging athlete users...")
    try:
        debug_athlete_users()
    except Exception as e:
        print(f"Error debugging: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
