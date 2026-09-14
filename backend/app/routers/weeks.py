from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_session
from app.models import DinnerSlot, Recipe
from app.schemas import DinnerSlotAdd, DinnerSlotRead, WeekBoardRead

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


def _require_day(day_of_week: int) -> None:
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="day_of_week must be 0–6 (Mon–Sun)",
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
        .order_by(DinnerSlot.day_of_week.asc())
        .all()
    )
    by_day: dict[int, list[Recipe]] = {day: [] for day in range(7)}
    for slot in slots:
        by_day[slot.day_of_week].append(slot.recipe)

    days = [
        DinnerSlotRead(day_of_week=day, recipes=by_day[day]) for day in range(7)
    ]
    return WeekBoardRead(week_start=week_start, days=days)



@router.get("/{week_start}", response_model=WeekBoardRead)
def get_week(week_start: date, db: Session = Depends(get_db)) -> WeekBoardRead:
    _require_monday(week_start)
    return _build_week_board(db, week_start)


@router.post(
    "/{week_start}/days/{day_of_week}/recipes",
    response_model=WeekBoardRead,
)
def add_day_recipe(
    week_start: date,
    day_of_week: int,
    payload: DinnerSlotAdd,
    db: Session = Depends(get_db),
) -> WeekBoardRead:
    _require_monday(week_start)
    _require_day(day_of_week)

    recipe = db.get(Recipe, payload.recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    duplicate = (
        db.query(DinnerSlot)
        .filter(
            DinnerSlot.week_start == week_start,
            DinnerSlot.day_of_week == day_of_week,
            DinnerSlot.recipe_id == payload.recipe_id,
        )
        .one_or_none()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Recipe already slotted for this day",
        )

    db.add(
        DinnerSlot(
            week_start=week_start,
            day_of_week=day_of_week,
            recipe_id=payload.recipe_id,
        )
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "uq_dinner_slots_week_day_recipe" in message or (
            "unique constraint failed" in message
            and "dinner_slots" in message
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Recipe already slotted for this day",
            ) from None
        raise

    return _build_week_board(db, week_start)


@router.delete(
    "/{week_start}/days/{day_of_week}/recipes/{recipe_id}",
    response_model=WeekBoardRead,
)
def remove_day_recipe(
    week_start: date,
    day_of_week: int,
    recipe_id: int,
    db: Session = Depends(get_db),
) -> WeekBoardRead:
    _require_monday(week_start)
    _require_day(day_of_week)

    slot = (
        db.query(DinnerSlot)
        .filter(
            DinnerSlot.week_start == week_start,
            DinnerSlot.day_of_week == day_of_week,
            DinnerSlot.recipe_id == recipe_id,
        )
        .one_or_none()
    )
    if slot is not None:
        db.delete(slot)
        db.commit()

    return _build_week_board(db, week_start)


@router.delete(
    "/{week_start}/days/{day_of_week}",
    response_model=WeekBoardRead,
)
def clear_day(
    week_start: date,
    day_of_week: int,
    db: Session = Depends(get_db),
) -> WeekBoardRead:
    _require_monday(week_start)
    _require_day(day_of_week)

    (
        db.query(DinnerSlot)
        .filter(
            DinnerSlot.week_start == week_start,
            DinnerSlot.day_of_week == day_of_week,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return _build_week_board(db, week_start)
