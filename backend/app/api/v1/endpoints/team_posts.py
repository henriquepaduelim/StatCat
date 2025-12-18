from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
import io
import json
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlmodel import Session

from app.api.deps import SessionDep, get_current_active_user, ensure_roles
from app.core.config import settings
from app.models.athlete import Athlete
from app.models.team import CoachTeamLink, Team
from app.models.team_post import TeamPost
from app.models.user import User, UserRole
from app.schemas.team_post import TeamPostRead

router = APIRouter()

media_root = Path(settings.MEDIA_ROOT)
team_posts_root = media_root / "team_posts"
team_posts_root.mkdir(parents=True, exist_ok=True)

MAX_MEDIA_SIZE = 8 * 1024 * 1024  # 8 MB
ALLOWED_MEDIA_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".mp4"}
ALLOWED_MEDIA_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4",
}


def _safe_filename(filename: str | None) -> str:
    stem = (filename or "upload").replace("/", "_").replace("\\", "_").strip()
    return stem or "upload"


def _store_media(team_id: int, file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_MEDIA_EXTENSIONS or (
        file.content_type and file.content_type.lower() not in ALLOWED_MEDIA_MIME_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported media type.",
        )
    file.file.seek(0)
    data = file.file.read()
    if len(data) > MAX_MEDIA_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds allowed size",
        )
    destination_dir = team_posts_root / str(team_id)
    destination_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    destination = destination_dir / f"{timestamp}_{_safe_filename(file.filename)}"
    destination.write_bytes(data)
    relative_path = destination.relative_to(media_root)
    return f"/media/{relative_path.as_posix()}"


def _get_team(session: Session, team_id: int) -> Team:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    return team


def _ensure_team_access(session: Session, current_user: User, team_id: int) -> Team:
    team = _get_team(session, team_id)

    if current_user.role in {UserRole.ADMIN, UserRole.STAFF}:
        return team

    if current_user.role == UserRole.COACH:
        membership_exists = session.exec(
            select(CoachTeamLink).where(
                CoachTeamLink.team_id == team_id,
                CoachTeamLink.user_id == current_user.id,
            )
        ).first()
        if membership_exists:
            return team
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if current_user.role == UserRole.ATHLETE:
        if current_user.athlete_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
        athlete = session.get(Athlete, current_user.athlete_id)
        if athlete and athlete.team_id == team_id:
            return team
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


def _build_post_response(
    session: Session, posts: Iterable[TeamPost]
) -> list[TeamPostRead]:
    posts_list = list(posts)
    if not posts_list:
        return []
    author_ids = {post.author_id for post in posts_list}
    authors = session.exec(select(User).where(User.id.in_(author_ids))).scalars().all()
    author_map = {author.id: author for author in authors}

    response: list[TeamPostRead] = []
    for post in posts_list:
        author = author_map.get(post.author_id)
        author_name = author.full_name if author else "Unknown user"
        author_role = author.role.value if author else "unknown"
        response.append(
            TeamPostRead(
                id=post.id,
                team_id=post.team_id,
                author_id=post.author_id,
                author_name=author_name,
                author_role=author_role,
                content=post.content,
                media_url=post.media_url,
                created_at=post.created_at,
            )
        )
    return response


@router.get("/teams/{team_id}/posts", response_model=list[TeamPostRead])
def list_team_posts(
    team_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_active_user),
    page: int = 1,
    size: int = 50,
) -> list[TeamPostRead]:
    if page < 1:
        page = 1
    if size < 1:
        size = 50
    if size > 100:
        size = 100

    _ensure_team_access(session, current_user, team_id)
    offset = (page - 1) * size
    statement = (
        select(TeamPost)
        .where(TeamPost.team_id == team_id)
        .order_by(TeamPost.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    posts = session.exec(statement).scalars().all()
    return _build_post_response(session, posts)


@router.post(
    "/teams/{team_id}/posts",
    response_model=TeamPostRead,
    status_code=status.HTTP_201_CREATED,
)
def create_team_post(
    team_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_active_user),
    content: str = Form(default=""),
    media: UploadFile | None = File(default=None),
) -> TeamPostRead:
    _ensure_team_access(session, current_user, team_id)
    normalized_content = content.strip()
    if not normalized_content and media is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content or media is required",
        )

    media_url = None
    if media is not None:
        media_url = _store_media(team_id, media)

    post = TeamPost(
        team_id=team_id,
        author_id=current_user.id,
        content=normalized_content,
        media_url=media_url,
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    return _build_post_response(session, [post])[0]


@router.post(
    "/team-posts/export",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
)
def export_team_posts(
    session: SessionDep,
    current_user: User = Depends(get_current_active_user),
    team_id: int | None = None,
    delete_after: bool = False,
    include_posts: bool = True,
):
    ensure_roles(current_user, {UserRole.ADMIN})
    statement = select(TeamPost)
    if team_id is not None:
        statement = statement.where(TeamPost.team_id == team_id)
    posts = session.exec(statement).scalars().all()

    buffer = io.BytesIO()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        if include_posts:
            payload = [
                {
                    "id": post.id,
                    "team_id": post.team_id,
                    "author_id": post.author_id,
                    "content": post.content,
                    "media_url": post.media_url,
                    "created_at": post.created_at.isoformat(),
                }
                for post in posts
            ]
            zip_file.writestr("posts.json", json.dumps(payload, indent=2))

        for post in posts:
            if post.media_url and post.media_url.startswith("/media/"):
                relative_path = post.media_url[len("/media/") :]
                media_path = media_root / relative_path
                if media_path.exists():
                    arcname = f"media/{relative_path}"
                    zip_file.write(media_path, arcname=arcname)

    buffer.seek(0)

    if delete_after and posts:
        for post in posts:
            if post.media_url and post.media_url.startswith("/media/"):
                relative_path = post.media_url[len("/media/") :]
                media_path = media_root / relative_path
                if media_path.exists():
                    media_path.unlink(missing_ok=True)
            session.delete(post)
        session.commit()

    headers = {
        "Content-Disposition": f'attachment; filename="team-posts-{timestamp}.zip"',
    }
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)
