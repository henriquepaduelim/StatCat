
import os
from datetime import datetime, timedelta
from typing import List

import numpy as np
from faker import Faker
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import get_session
from app.models import Athlete, AssessmentSession, SessionResult, TestDefinition
from app.models.athlete import AthleteGender

router = APIRouter()

# --- Environment Guard ---
if os.getenv("ENV") == "production":

    @router.post("/seed")
    def seed_dev_data_prod_block():
        raise HTTPException(
            status_code=403,
            detail="This endpoint is disabled in the production environment.",
        )


# --- Pydantic Models for Response ---
class TestResult(BaseModel):
    test_name: str
    value: float
    unit: str


class SessionData(BaseModel):
    id: int
    results: List[TestResult]


class AthleteData(BaseModel):
    id: int
    sessions: List[SessionData]


class SeedResponse(BaseModel):
    created: bool
    athletes: List[AthleteData]


# --- Test Definitions ---
# Based on existing tests in seed.py
TESTS = [
    {
        "name": "Resting Heart Rate (Seated)",
        "unit": "bpm",
        "direction": "lower",
        "range": (45, 65),
    },
    {
        "name": "20 m Slalom with Ball",
        "unit": "s",
        "direction": "lower",
        "range": (7, 8.5),
    },
    {
        "name": "Shot Power (Run-Up, Right Foot)",
        "unit": "km/h",
        "direction": "higher",
        "range": (110, 130),
    },
    {
        "name": "Shot Power (Run-Up, Left Foot)",
        "unit": "km/h",
        "direction": "higher",
        "range": (100, 120),
    },
    {"name": "10 m Sprint", "unit": "s", "direction": "lower", "range": (1.6, 1.9)},
    {"name": "30 m Sprint", "unit": "s", "direction": "lower", "range": (4.2, 4.8)},
    {
        "name": "Vertical Jump (No Run-Up)",
        "unit": "cm",
        "direction": "higher",
        "range": (50, 65),
    },
    {"name": "Plank (Max Time)", "unit": "s", "direction": "higher", "range": (120, 240)},
    {"name": "Beep Test", "unit": "level", "direction": "higher", "range": (10, 14)},
    {"name": "Yo-Yo IR1", "unit": "level", "direction": "higher", "range": (18, 22)},
]


# --- Persistence Stubs ---
def create_athlete(db: Session, athlete_data: dict) -> Athlete:
    athlete = Athlete(**athlete_data)
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return athlete


def create_assessment_session(db: Session, session_data: dict) -> AssessmentSession:
    session = AssessmentSession(**session_data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def create_session_result(db: Session, result_data: dict) -> SessionResult:
    # Ensure TestDefinition exists, or create it
    test_def = db.query(TestDefinition).filter_by(name=result_data["test_name"]).first()
    if not test_def:
        test_info = next(
            (t for t in TESTS if t["name"] == result_data["test_name"]), None
        )
        if not test_info:
            # This should not happen if TESTS is comprehensive
            raise ValueError(f"Test definition not found for {result_data['test_name']}")

        # Assuming a default client_id=1 for simplicity for dev seeding
        test_def = TestDefinition(
            client_id=1,
            name=test_info["name"],
            unit=test_info["unit"],
            target_direction=test_info["direction"],
        )
        db.add(test_def)
        db.commit()
        db.refresh(test_def)

    result = SessionResult(
        session_id=result_data["session_id"],
        athlete_id=result_data["athlete_id"],
        test_id=test_def.id,
        value=result_data["value"],
        unit=result_data["unit"],
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


# --- Data Generation ---
fake = Faker()
Faker.seed(0)  # for reproducibility


def generate_dev_data(db: Session, num_athletes: int = 5) -> SeedResponse:
    response = SeedResponse(created=True, athletes=[])

    for _ in range(num_athletes):
        # 1. Create Athlete
        athlete_model_data = {
            "client_id": 1,  # Assuming client_id=1 for MVP Sports
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(),
            "birth_date": fake.date_of_birth(minimum_age=16, maximum_age=28),
            "gender": np.random.choice(list(AthleteGender)),
            "height_cm": round(np.random.normal(180, 10), 1),
            "weight_kg": round(np.random.normal(75, 8), 1),
        }
        athlete = create_athlete(db, athlete_model_data)
        athlete_response = AthleteData(id=athlete.id, sessions=[])

        # 2. Create Sessions (5-7 per athlete)
        num_sessions = np.random.randint(5, 8)
        session_date = datetime.utcnow() - timedelta(days=num_sessions * 90)

        for i in range(num_sessions):
            session_model_data = {
                "client_id": 1,
                "athlete_id": athlete.id,
                "name": f"Assessment Period {i + 1}",
                "scheduled_at": session_date,
            }
            session = create_assessment_session(db, session_model_data)
            session_response = SessionData(id=session.id, results=[])

            # 3. Create Results for each test
            for test in TESTS:
                base_value = np.random.uniform(test["range"][0], test["range"][1])
                progress_factor = (i + 1) * 0.01  # 1% improvement per session

                if test["direction"] == "higher":
                    value = base_value * (1 + progress_factor)
                else:  # lower is better
                    value = base_value * (1 - progress_factor)

                # Round to 2 decimal places for cleaner data
                value = round(value, 2)

                result_model_data = {
                    "session_id": session.id,
                    "athlete_id": athlete.id,
                    "test_name": test["name"],
                    "value": value,
                    "unit": test["unit"],
                }
                create_session_result(db, result_model_data)
                session_response.results.append(
                    TestResult(
                        test_name=test["name"], value=value, unit=test["unit"]
                    )
                )

            athlete_response.sessions.append(session_response)
            session_date += timedelta(days=90 + np.random.randint(-5, 5))

        response.athletes.append(athlete_response)

    return response


# --- API Endpoint ---
if os.getenv("ENV") != "production":

    @router.post("/seed", response_model=SeedResponse)
    def seed_dev_data(
        db: Session = Depends(get_session),
    ):
        """
        Generates and persists fictitious data for development.
        - Creates 5 new athletes.
        - Each athlete gets 5-7 assessment sessions spaced ~90 days apart.
        - Each session includes plausible results for all predefined tests.
        - Simulates slight progress between sessions.
        - Blocked in production.
        """
        try:
            return generate_dev_data(db)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
