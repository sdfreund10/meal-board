from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_session
from app.models import Recipe
from app.schemas import RecipeCreate, RecipeRead, RecipeUpdate
from app.services.recipes import (
    get_recipe_or_404,
    list_recipes_query,
    replace_ingredients,
    replace_steps,
    resolve_tags,
)

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"],
    dependencies=[Depends(require_session)],
)


@router.get("", response_model=list[RecipeRead])
def list_recipes(db: Session = Depends(get_db)) -> list[Recipe]:
    return list_recipes_query(db)


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe(payload: RecipeCreate, db: Session = Depends(get_db)) -> Recipe:
    recipe = Recipe(
        name=payload.name,
        rating=payload.rating,
        leftovers=payload.leftovers,
        source_url=payload.source_url,
    )
    replace_ingredients(recipe, payload.ingredients)
    replace_steps(recipe, payload.steps)
    recipe.tags = resolve_tags(db, payload.tag_ids)
    db.add(recipe)
    db.commit()
    return get_recipe_or_404(db, recipe.id)


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)) -> Recipe:
    return get_recipe_or_404(db, recipe_id)


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe(
    recipe_id: int,
    payload: RecipeUpdate,
    db: Session = Depends(get_db),
) -> Recipe:
    recipe = get_recipe_or_404(db, recipe_id)
    data = payload.model_dump(exclude_unset=True)
    has_ingredients = "ingredients" in data
    has_steps = "steps" in data
    has_tag_ids = "tag_ids" in data
    data.pop("ingredients", None)
    data.pop("steps", None)
    data.pop("tag_ids", None)

    for key, value in data.items():
        setattr(recipe, key, value)

    if has_ingredients:
        replace_ingredients(recipe, payload.ingredients or [])
    if has_steps:
        replace_steps(recipe, payload.steps or [])
    if has_tag_ids:
        recipe.tags = resolve_tags(db, payload.tag_ids or [])

    db.commit()
    return get_recipe_or_404(db, recipe.id)


@router.delete(
    "/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)) -> Response:
    recipe = get_recipe_or_404(db, recipe_id)
    db.delete(recipe)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
