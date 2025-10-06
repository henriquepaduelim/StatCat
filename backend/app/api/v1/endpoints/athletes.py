from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.athlete import Athlete
from app.schemas.athlete import AthleteCreate, AthleteRead, AthleteUpdate

router = APIRouter()


@router.get("/", response_model=list[AthleteRead])
def list_athletes(session: Session = Depends(get_session)) -> list[AthleteRead]:
    return session.exec(select(Athlete)).all()


@router.post("/", response_model=AthleteRead, status_code=status.HTTP_201_CREATED)
def create_athlete(
    payload: AthleteCreate, session: Session = Depends(get_session)
) -> AthleteRead:
    athlete = Athlete.model_validate(payload)
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.get("/{athlete_id}", response_model=AthleteRead)
def get_athlete(
    athlete_id: int, session: Session = Depends(get_session)
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    return athlete


@router.patch("/{athlete_id}", response_model=AthleteRead)
def update_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    session: Session = Depends(get_session),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(athlete, field, value)

    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
    athlete_id: int, session: Session = Depends(get_session)
) -> None:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    session.delete(athlete)
    session.commit()
    return None
