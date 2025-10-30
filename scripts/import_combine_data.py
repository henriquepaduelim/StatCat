import sys
import os

# Add the 'backend' directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

import csv
from datetime import date, datetime
from io import StringIO

from sqlmodel import Session, select, delete, create_engine

# Correctly point to the database file used by the application
db_path = os.path.join(backend_dir, 'combine.db')
engine = create_engine(f"sqlite:///{db_path}")

from app.models.assessment_session import AssessmentSession
from app.models.athlete import (
    Athlete,
    AthleteDetail,
    AthleteDocument,
    AthletePayment,
)
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition

# Raw CSV data provided by the user
CSV_DATA = """
;;Name;Age;Sitting Height;Standing Height;Weight (kg);10m;20m;35m;Yoyo;Jump (cm);Max Power (km)
B3;11;Jakub Pyziak;18;132;172,5;66,5;1,74;3,02;4,78;19,8;31,5;100
B10;15;George Kokinias;15;131,9;174,4;60,7;1,68;2,96;4,77;14,7;43,8;92
B11;12;Cristian Stroescu;15;136,8;176,3;69,9;1,76;3,05;4,8;15,1;35,3;91
B12;18;Fiton Mirena;15;122,8;159,7;48,3;1,98;3,39;5,34;16,8;36,9;88
B8;13;Daniel Zuccarini;15;128,7;171;56,3;1,83;3,18;5,07;18,5;35;87
B6;14;Anthony Zuccarini;12;118,7;150,8;45,8;1,89;3,33;5,43;16,5;30,3;87
B4;3;Lucas Antoniades;13;127,4;163,1;54,3;1,79;3,10;4,94;18,5;39,1;84
Y6;17;Andre Mirena;12;122,4;157,3;46,8;1,93;3,31;5,23;16,5;30;81
B2;16;Jacob Ibell;13;121;163,5;51,1;2,1;3,76;6,16;14,2;21,2;80
Y7;19;Spenser Xu;13;124,7;163;49,3;2,01;3,53;5,74;15,6;30;80
B5;10;Logan Murer;15;131,5;173;60,1;1,86;3,23;5,1;19,2;36,7;79
Y1;1;Paige Maniateas;13;125;162,5;50,1;2,07;3,65;5,84;14,5;24,2;79
B7;2;Evan Alonzi;12;116,8;146,3;43,1;2,02;3,52;5,63;16,4;26,6;77
Y8;20;Daniel Pulido;11;116;150,4;36,5;2,08;3,67;5,89;14,8;21,6;74
B1;8;Liam Marques;13;123,2;162,4;48,9;2,03;3,49;5,6;14,8;29,3;72
Y2;6;Lia Garel;13;124,1;156;45;2,19;3,72;5,86;16,2;27;71
Y5;9;Sarah Maya;13;121,4;156,4;48,5;1,95;3,45;5,53;14,3;24,9;71
Y4;4;Sienna Barone;13;123,2;156,4;43,9;2,1;3,64;5,76;17,3;23,8;66
Y3;5;Aleena Fera;13;121,5;156,4;45,2;2,08;3,69;5,91;16,4;20,5;66
B9;7;Eesa Khan;13;124,5;166,5;52,2;1,88;3,45;5,55;16,4;28,4;42
"""

# Define the new standard tests based on the CSV header
NEW_TEST_DEFINITIONS = [
    {"name": "Sitting Height", "category": "Anthropometry", "unit": "cm", "target_direction": "higher"},
    {"name": "Standing Height", "category": "Anthropometry", "unit": "cm", "target_direction": "higher"},
    {"name": "Weight", "category": "Anthropometry", "unit": "kg", "target_direction": "higher"},
    {"name": "10m Sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "20m Sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "35m Sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "Yo-Yo Intermittent Recovery Test", "category": "Endurance", "unit": "level", "target_direction": "higher"},
    {"name": "Vertical Jump", "category": "Power", "unit": "cm", "target_direction": "higher"},
    {"name": "Max Power", "category": "Power", "unit": "km", "target_direction": "higher"},
]

# Map CSV columns to test names used in NEW_TEST_DEFINITIONS
COLUMN_TO_TEST_MAP = {
    "Sitting Height": "Sitting Height",
    "Standing Height": "Standing Height",
    "Weight (kg)": "Weight",
    "10m": "10m Sprint",
    "20m": "20m Sprint",
    "35m": "35m Sprint",
    "Yoyo": "Yo-Yo Intermittent Recovery Test",
    "Jump (cm)": "Vertical Jump",
    "Max Power (km)": "Max Power",
}

def create_new_test_definitions(session: Session) -> dict[str, TestDefinition]:
    """Creates the new standard test definitions."""
    print("Creating new test definitions...")
    test_definitions = {}
    for test_data in NEW_TEST_DEFINITIONS:
        test_def = TestDefinition(**test_data)
        session.add(test_def)
        session.commit()
        session.refresh(test_def)
        test_definitions[test_def.name] = test_def
    print(f"{len(test_definitions)} test definitions created.")
    return test_definitions

def import_data_from_csv(session: Session, test_definitions: dict[str, TestDefinition]):
    """Imports athlete and result data from the CSV."""
    print("Importing athlete and result data...")
    csv_file = StringIO(CSV_DATA.strip())
    reader = csv.reader(csv_file, delimiter=";")
    header = next(reader)  # Skip header row

    # Create a single assessment session for this import
    assessment_session = AssessmentSession(
        name="Combine Testing Day",
        location="Training Center",
        scheduled_at=datetime.utcnow(),
        notes="Initial data import from combineModelSheet.xlsx",
    )
    session.add(assessment_session)
    session.commit()
    session.refresh(assessment_session)

    athletes_created = 0
    for row in reader:
        if not any(row):  # Skip empty rows
            continue

        name = row[2]
        age = int(row[3])
        standing_height = float(row[5].replace(",", "."))
        weight = float(row[6].replace(",", "."))
        
        # Split name and estimate birth date
        first_name, last_name = (name.split(" ", 1) + [""])[:2]
        birth_year = date.today().year - age
        birth_date = date(birth_year, 1, 1)
        email = f"{first_name.lower()}.{last_name.lower()}@combine.local"

        athlete = Athlete(
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            email=email,
            height_cm=standing_height,
            weight_kg=weight,
        )
        session.add(athlete)
        session.commit()
        session.refresh(athlete)
        athletes_created += 1

        # Add results for the athlete
        for i, value_str in enumerate(row):
            # Result columns start at index 4 in the CSV
            if i >= 4 and value_str:
                csv_column_name = header[i]
                if csv_column_name in COLUMN_TO_TEST_MAP:
                    test_name = COLUMN_TO_TEST_MAP[csv_column_name]
                    test_def = test_definitions[test_name]
                    
                    # Convert comma decimal to dot
                    value = float(value_str.replace(",", "."))

                    result = SessionResult(
                        session_id=assessment_session.id,
                        athlete_id=athlete.id,
                        test_id=test_def.id,
                        value=value,
                        unit=test_def.unit,
                    )
                    session.add(result)
    
    session.commit()
    print(f"Successfully imported data for {athletes_created} athletes.")

def main():
    """Main function to run the import process."""
    with Session(engine) as session:
        # Create new test definitions
        test_definitions = create_new_test_definitions(session)

        # Import data from CSV
        import_data_from_csv(session, test_definitions)

    print("\nImport process complete.")


if __name__ == "__main__":
    # A simple safety check
    user_confirmation = input(
        "This script will add new data and can optionally clear existing data.\n"
        "Are you sure you want to continue? (yes/no): "
    )
    if user_confirmation.lower() == "yes":
        # Ask about clearing data
        clear_data_confirmation = input(
            "Do you want to clear ALL existing athlete and test data before importing? (yes/no): "
        )
        if clear_data_confirmation.lower() == "yes":
             with Session(engine) as session:
                print("Clearing existing data...")
                session.exec(delete(SessionResult))
                session.exec(delete(AssessmentSession))
                session.exec(delete(AthleteDetail))
                session.exec(delete(AthleteDocument))
                session.exec(delete(AthletePayment))
                # Need to delete athletes before teams if there is a dependency
                # but the schema does not show one from athlete to team.
                # We will delete athletes that have no team_id first.
                session.exec(delete(Athlete).where(Athlete.team_id == None))
                session.commit()
                # Now delete remaining athletes
                session.exec(delete(Athlete))
                session.exec(delete(TestDefinition))
                session.commit()
                print("Existing data has been cleared.")
        
        main()

    else:
        print("Import cancelled.")
