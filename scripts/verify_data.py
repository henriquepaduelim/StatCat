import sys
import os

# Add the 'backend' directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

from sqlmodel import Session, select
from app.db.session import engine
from app.models.athlete import Athlete
from app.models.test_definition import TestDefinition

def main():
    """Connects to the database and prints athletes and test definitions."""
    print("Connecting to the database...")
    with Session(engine) as session:
        print("Fetching test definitions...")
        test_defs = session.exec(select(TestDefinition)).all()
        if test_defs:
            print(f"Found {len(test_defs)} test definitions:")
            for test in test_defs:
                print(f"  - {test.name}")
        else:
            print("No test definitions found.")

        print("\nFetching athletes...")
        athletes = session.exec(select(Athlete)).all()
        if athletes:
            print(f"Found {len(athletes)} athletes:")
            for athlete in athletes:
                print(f"  - {athlete.first_name} {athlete.last_name}")
        else:
            print("No athletes found.")

if __name__ == "__main__":
    main()

