from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

recipe_tags = Table(
    "recipe_tags",
    Base.metadata,
    Column(
        "recipe_id",
        ForeignKey("recipes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint(
            "rating IS NULL OR rating IN ('up', 'down')",
            name="ck_recipes_rating",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    leftovers: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    source_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    ingredients: Mapped[List[RecipeIngredient]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.position",
    )
    steps: Mapped[List[RecipeStep]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.position",
    )
    tags: Mapped[List[Tag]] = relationship(
        secondary=recipe_tags,
        back_populates="recipes",
    )
    dinner_slots: Mapped[List[DinnerSlot]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=""
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    recipe: Mapped[Recipe] = relationship(back_populates="steps")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    board_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    recipes: Mapped[List[Recipe]] = relationship(
        secondary=recipe_tags,
        back_populates="tags",
    )


class DinnerSlot(Base):
    __tablename__ = "dinner_slots"
    __table_args__ = (
        UniqueConstraint("week_start", "day_of_week", name="uq_dinner_slots_week_day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )

    recipe: Mapped[Recipe] = relationship(back_populates="dinner_slots")
