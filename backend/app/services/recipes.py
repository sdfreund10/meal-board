from __future__ import annotations

from typing import List, Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe, RecipeIngredient, RecipeStep, Tag
from app.schemas import IngredientIn, StepIn


def get_recipe_or_404(db: Session, recipe_id: int) -> Recipe:
    recipe = (
        db.query(Recipe)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        )
        .filter(Recipe.id == recipe_id)
        .one_or_none()
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )
    return recipe


def list_recipes_query(db: Session) -> List[Recipe]:
    return (
        db.query(Recipe)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        )
        .order_by(Recipe.name.asc())
        .all()
    )


def resolve_tags(db: Session, tag_ids: Sequence[int]) -> List[Tag]:
    if not tag_ids:
        return []
    unique_ids = list(dict.fromkeys(tag_ids))
    tags = db.query(Tag).filter(Tag.id.in_(unique_ids)).all()
    if len(tags) != len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more tags not found",
        )
    by_id = {tag.id: tag for tag in tags}
    return [by_id[tag_id] for tag_id in unique_ids]


def replace_ingredients(recipe: Recipe, ingredients: List[IngredientIn]) -> None:
    recipe.ingredients.clear()
    for position, ingredient in enumerate(ingredients):
        recipe.ingredients.append(
            RecipeIngredient(
                name=ingredient.name,
                quantity=ingredient.quantity,
                position=position,
            )
        )


def replace_steps(recipe: Recipe, steps: List[StepIn]) -> None:
    recipe.steps.clear()
    for position, step in enumerate(steps):
        recipe.steps.append(
            RecipeStep(
                text=step.text,
                position=position,
            )
        )
