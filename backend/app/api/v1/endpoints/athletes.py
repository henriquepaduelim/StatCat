from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteGender
from app.models.user import User
from app.schemas.athlete import AthleteCreate, AthleteRead, AthleteUpdate

media_root = Path(settings.MEDIA_ROOT)
athlete_media_root = media_root / "athletes"
athlete_media_root.mkdir(parents=True, exist_ok=True)

MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter()


@router.get("/", response_model=list[AthleteRead])
def list_athletes(
    client_id: int | None = None,
    gender: AthleteGender | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[AthleteRead]:
    statement = select(Athlete)
    if current_user.role == "club":
        statement = statement.where(Athlete.client_id == current_user.client_id)
    elif client_id is not None:
        statement = statement.where(Athlete.client_id == client_id)
    if gender is not None:
        statement = statement.where(Athlete.gender == gender)
    return session.exec(statement).all()


@router.post("/", response_model=AthleteRead, status_code=status.HTTP_201_CREATED)
def create_athlete(
    payload: AthleteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    data = payload.model_dump()
    if current_user.role == "club":
        data["client_id"] = current_user.client_id
    athlete = Athlete.model_validate(data)
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.get("/{athlete_id}", response_model=AthleteRead)
def get_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == "club" and athlete.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return athlete


@router.patch("/{athlete_id}", response_model=AthleteRead)
def update_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == "club" and athlete.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(athlete, field, value)

    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == "club" and athlete.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    session.delete(athlete)
    session.commit()
    return None


@router.post("/{athlete_id}/photo", response_model=AthleteRead)
async def upload_photo(
    athlete_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == "club" and athlete.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    content_type = (file.content_type or "").lower()
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/heic": ".heic",
        "image/heif": ".heif",
    }
    if content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    extension = allowed_types[content_type]

    athlete_dir = athlete_media_root / str(athlete_id)
    athlete_dir.mkdir(parents=True, exist_ok=True)
    destination = athlete_dir / f"profile{extension}"

    data = await file.read()
    if len(data) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 5MB limit",
        )
    destination.write_bytes(data)

    relative_path = destination.relative_to(media_root)
    athlete.photo_url = f"/media/{relative_path.as_posix()}"
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete
