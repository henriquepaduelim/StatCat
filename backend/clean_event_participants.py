"""
Script to clean up event participants where admin user_id was used as placeholder for athletes.
This removes participant entries where user_id matches admin but athlete_id is also set.
"""
from sqlmodel import Session, select, create_engine
from app.models.event import EventParticipant
from app.core.config import settings

# Create engine
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

def clean_placeholder_participants():
    """Remove participant entries where both user_id and athlete_id are set (placeholders)."""
    with Session(engine) as session:
        # Find all participants that have both user_id and athlete_id
        # These are the problematic "placeholder" entries
        stmt = select(EventParticipant).where(
            EventParticipant.athlete_id.is_not(None),
            EventParticipant.user_id.is_not(None)
        )
        
        placeholders = session.exec(stmt).all()
        
        if not placeholders:
            print("✅ No placeholder participants found. Database is clean!")
            return
        
        print(f"Found {len(placeholders)} placeholder participant entries")
        print("These will be converted to athlete-only participants (user_id = None)")
        
        for participant in placeholders:
            print(f"  - Event ID: {participant.event_id}, Athlete ID: {participant.athlete_id}, User ID: {participant.user_id}")
            # Set user_id to None for athlete-only participants
            participant.user_id = None
        
        session.commit()
        print(f"\n✅ Successfully cleaned {len(placeholders)} placeholder entries!")
        print("Athletes will no longer appear as pending confirmations for admin users.")

if __name__ == "__main__":
    clean_placeholder_participants()
