from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_session
from app.models import DinnerSlot, Recipe
from app.schemas import DinnerSlotAssign, DinnerSlotRead, WeekBoardRead

router = APIRouter(
    prefix="/weeks",
    tags=["weeks"],
    dependencies=[Depends(require_session)],
)


def _require_monday(week_start: date) -> None:
    if week_start.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="week_start must be a Monday (ISO week start)",
        )


def _recipe_load_options():
    return (
        selectinload(DinnerSlot.recipe).selectinload(Recipe.ingredients),
        selectinload(DinnerSlot.recipe).selectinload(Recipe.steps),
        selectinload(DinnerSlot.recipe).selectinload(Recipe.tags),
    )


def _build_week_board(db: Session, week_start: date) -> WeekBoardRead:
    slots = (
        db.query(DinnerSlot)
        .options(*_recipe_load_options())
        .filter(DinnerSlot.week_start == week_start)
        .all()
    )
    by_day = {slot.day_of_week: slot for slot in slots}
    days: list[DinnerSlotRead] = []
    for day in range(7):
        slot = by_day.get(day)
        days.append(
            DinnerSlotRead(
                day_of_week=day,
                recipe=slot.recipe if slot is not None else None,
            )
        )
    return WeekBoardRead(week_start=week_start, days=days)


@router.get("/{week_start}", response_model=WeekBoardRead)
def get_week(week_start: date, db: Session = Depends(get_db)) -> WeekBoardRead:
    _require_monday(week_start)
    return _build_week_board(db, week_start)


@router.put("/{week_start}/days/{day_of_week}", response_model=WeekBoardRead)
def assign_day(
    week_start: date,
    day_of_week: int,
    payload: DinnerSlotAssign,
    db: Session = Depends(get_db),
) -> WeekBoardRead:
    _require_monday(week_start)
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="day_of_week must be 0–6 (Mon–Sun)",
        )

    existing = (
        db.query(DinnerSlot)
        .filter(
            DinnerSlot.week_start == week_start,
            DinnerSlot.day_of_week == day_of_week,
        )
        .one_or_none()
    )

    if payload.recipe_id is None:
        if existing is not None:
            db.delete(existing)
            db.commit()
        return _build_week_board(db, week_start)

    recipe = db.get(Recipe, payload.recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    if existing is None:
        db.add(
            DinnerSlot(
                week_start=week_start,
                day_of_week=day_of_week,
                recipe_id=payload.recipe_id,
            )
        )
    else:
        existing.recipe_id = payload.recipe_id

    db.commit()
    return _build_week_board(db, week_start)
