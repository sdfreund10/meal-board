from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

Rating = Optional[Literal["up", "down"]]


class IngredientIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    quantity: str = Field(default="", max_length=255)


class IngredientRead(IngredientIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int


class StepIn(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


class StepRead(StepIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int


class TagBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    board_visible: bool = False


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    board_visible: Optional[bool] = None


class TagRead(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class RecipeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    rating: Rating = None
    leftovers: bool = False
    source_url: Optional[str] = Field(default=None, max_length=2048)

    @field_validator("source_url")
    @classmethod
    def source_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        # AnyHttpUrl rejects javascript:/data: and non-http schemes.
        return str(AnyHttpUrl(value))


class RecipeCreate(RecipeBase):
    ingredients: List[IngredientIn] = Field(default_factory=list)
    steps: List[StepIn] = Field(default_factory=list)
    tag_ids: List[int] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    rating: Rating = None
    leftovers: Optional[bool] = None
    source_url: Optional[str] = Field(default=None, max_length=2048)
    ingredients: Optional[List[IngredientIn]] = None
    steps: Optional[List[StepIn]] = None
    tag_ids: Optional[List[int]] = None

    @field_validator("source_url")
    @classmethod
    def source_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return str(AnyHttpUrl(value))


class RecipeRead(RecipeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredients: List[IngredientRead]
    steps: List[StepRead]
    tags: List[TagRead]
    created_at: datetime
    updated_at: datetime


class DinnerSlotAssign(BaseModel):
    """Set recipe_id to assign; null clears the night by deleting the slot row."""

    recipe_id: Optional[int] = None


class DinnerSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_of_week: int = Field(ge=0, le=6)
    recipe: Optional[RecipeRead] = None


class WeekBoardRead(BaseModel):
    week_start: date
    days: List[DinnerSlotRead]


class GroceryItemRead(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    quantities: List[str]


class AuthLogin(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


class AuthStatus(BaseModel):
    authenticated: bool
