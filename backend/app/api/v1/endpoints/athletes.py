from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import get_session
from app.models.athlete import Athlete
from app.schemas.athlete import AthleteCreate, AthleteRead, AthleteUpdate

media_root = Path(settings.MEDIA_ROOT)
athlete_media_root = media_root / "athletes"
athlete_media_root.mkdir(parents=True, exist_ok=True)

router = APIRouter()


@router.get("/", response_model=list[AthleteRead])
def list_athletes(
    client_id: int | None = None, session: Session = Depends(get_session)
) -> list[AthleteRead]:
    statement = select(Athlete)
    if client_id is not None:
        statement = statement.where(Athlete.client_id == client_id)
    return session.exec(statement).all()


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


@router.post("/{athlete_id}/photo", response_model=AthleteRead)
async def upload_photo(
    athlete_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    content_type = file.content_type or ""
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    extension = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[content_type]

    athlete_dir = athlete_media_root / str(athlete_id)
    athlete_dir.mkdir(parents=True, exist_ok=True)
    destination = athlete_dir / f"profile{extension}"

    data = await file.read()
    destination.write_bytes(data)

    relative_path = destination.relative_to(media_root)
    athlete.photo_url = f"/media/{relative_path.as_posix()}"
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete
