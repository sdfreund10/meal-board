from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_session
from app.models import Tag
from app.schemas import TagCreate, TagRead, TagUpdate

router = APIRouter(
    prefix="/tags",
    tags=["tags"],
    dependencies=[Depends(require_session)],
)


def _commit_tag_or_raise_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if (
            "uq_tags_name" in message
            or "tags.name" in message
            or "unique constraint failed: tags.name" in message
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tag name already exists",
            ) from None
        raise


@router.get("", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)) -> list[Tag]:
    return db.query(Tag).order_by(Tag.name.asc()).all()


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)) -> Tag:
    tag = Tag(name=payload.name, board_visible=payload.board_visible)
    db.add(tag)
    _commit_tag_or_raise_conflict(db)
    db.refresh(tag)
    return tag


@router.get("/{tag_id}", response_model=TagRead)
def get_tag(tag_id: int, db: Session = Depends(get_db)) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )
    return tag


@router.patch("/{tag_id}", response_model=TagRead)
def update_tag(
    tag_id: int,
    payload: TagUpdate,
    db: Session = Depends(get_db),
) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(tag, key, value)
    _commit_tag_or_raise_conflict(db)
    db.refresh(tag)
    return tag


@router.delete(
    "/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_tag(tag_id: int, db: Session = Depends(get_db)) -> Response:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )
    db.delete(tag)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
