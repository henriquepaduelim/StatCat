#!/usr/bin/env python3
"""Script to fix athlete status for existing users."""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlmodel import Session, select
from app.db.session import get_engine
from app.models.user import User, UserRole, AthleteStatus

def fix_athlete_statuses():
    """Fix athlete status for existing users who don't have it set."""
    engine = get_engine()
    
    with Session(engine) as session:
        # Find all athletes without proper status
        athletes = session.exec(
            select(User).where(
                User.role == UserRole.ATHLETE
            )
        ).all()
        
        updated_count = 0
        for athlete in athletes:
            # Set status to INCOMPLETE if not set or if it's None
            if athlete.athlete_status is None or str(athlete.athlete_status) == 'AthleteStatus.INCOMPLETE':
                athlete.athlete_status = AthleteStatus.INCOMPLETE
                updated_count += 1
                print(f"Updated athlete {athlete.email} status to INCOMPLETE")
        
        if updated_count > 0:
            session.commit()
            print(f"Updated {updated_count} athlete(s)")
        else:
            print("No athletes needed status updates")

if __name__ == "__main__":
    print("Fixing athlete statuses...")
    try:
        fix_athlete_statuses()
        print("Athlete statuses fixed successfully!")
    except Exception as e:
        print(f"Error fixing athlete statuses: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
