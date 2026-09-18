from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin, require_session
from app.models import DinnerSlot, Recipe
from app.schemas import DinnerSlotAdd, DinnerSlotRead, GroceryItemRead, WeekBoardRead

router = APIRouter(
    prefix="/weeks",
    tags=["weeks"],
    dependencies=[Depends(require_session)],
)

admin_router = APIRouter(
    prefix="/weeks",
    tags=["weeks"],
    dependencies=[Depends(require_session), Depends(require_admin)],
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
        .order_by(DinnerSlot.day_of_week.asc(), DinnerSlot.id.asc())
        .all()
    )
    by_day: dict[int, list[Recipe]] = {day: [] for day in range(7)}
    for slot in slots:
        by_day[slot.day_of_week].append(slot.recipe)

    days = [
        DinnerSlotRead(day_of_week=day, recipes=by_day[day]) for day in range(7)
    ]
    return WeekBoardRead(week_start=week_start, days=days)


def _build_grocery(db: Session, week_start: date) -> list[GroceryItemRead]:
    """Aggregate ingredients needed for all slotted recipes that week.

    Dedupes by strip().lower() name, keeps first-seen display casing, and
    lists quantities side-by-side (does not sum or parse units). Blank
    quantities are omitted from the list but the ingredient still appears.
    Order follows day → slot position → ingredient position.
    """
    slots = (
        db.query(DinnerSlot)
        .options(selectinload(DinnerSlot.recipe).selectinload(Recipe.ingredients))
        .filter(DinnerSlot.week_start == week_start)
        .order_by(DinnerSlot.day_of_week.asc(), DinnerSlot.id.asc())
        .all()
    )

    # key -> (display_name, quantities)
    aggregated: dict[str, tuple[str, list[str]]] = {}
    order: list[str] = []

    for slot in slots:
        ingredients = sorted(
            slot.recipe.ingredients,
            key=lambda ing: (ing.position, ing.id),
        )
        for ingredient in ingredients:
            key = ingredient.name.strip().lower()
            if not key:
                continue
            quantity = ingredient.quantity.strip()
            if key not in aggregated:
                aggregated[key] = (ingredient.name.strip(), [])
                order.append(key)
            if quantity:
                display_name, quantities = aggregated[key]
                aggregated[key] = (display_name, [*quantities, quantity])

    return [
        GroceryItemRead(name=aggregated[key][0], quantities=aggregated[key][1])
        for key in order
    ]


@router.get("/{week_start}/grocery", response_model=list[GroceryItemRead])
def get_week_grocery(
    week_start: date, db: Session = Depends(get_db)
) -> list[GroceryItemRead]:
    _require_monday(week_start)
    return _build_grocery(db, week_start)


@router.get("/{week_start}", response_model=WeekBoardRead)
def get_week(week_start: date, db: Session = Depends(get_db)) -> WeekBoardRead:
    _require_monday(week_start)
    return _build_week_board(db, week_start)


@admin_router.post(
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


@admin_router.delete(
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


@admin_router.delete(
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
