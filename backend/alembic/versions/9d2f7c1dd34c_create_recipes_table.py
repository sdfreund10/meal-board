"""Initial Mealboard schema: recipes, tags, dinner slots.

Revision ID: 9d2f7c1dd34c
Revises:
Create Date: 2026-09-13 23:02:49.682345

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9d2f7c1dd34c"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("rating", sa.String(length=16), nullable=True),
        sa.Column(
            "leftovers",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "rating IS NULL OR rating IN ('up', 'down')",
            name="ck_recipes_rating",
        ),
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "board_visible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.UniqueConstraint("name", name="uq_tags_name"),
    )

    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "quantity",
            sa.String(length=255),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "position",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_index(
        "ix_recipe_ingredients_recipe_id",
        "recipe_ingredients",
        ["recipe_id"],
    )

    op.create_table(
        "recipe_steps",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "position",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_index(
        "ix_recipe_steps_recipe_id",
        "recipe_steps",
        ["recipe_id"],
    )

    op.create_table(
        "recipe_tags",
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "dinner_slots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "week_start",
            "day_of_week",
            name="uq_dinner_slots_week_day",
        ),
    )
    op.create_index(
        "ix_dinner_slots_week_start",
        "dinner_slots",
        ["week_start"],
    )
    op.create_index(
        "ix_dinner_slots_recipe_id",
        "dinner_slots",
        ["recipe_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_dinner_slots_recipe_id", table_name="dinner_slots")
    op.drop_index("ix_dinner_slots_week_start", table_name="dinner_slots")
    op.drop_table("dinner_slots")
    op.drop_table("recipe_tags")
    op.drop_index("ix_recipe_steps_recipe_id", table_name="recipe_steps")
    op.drop_table("recipe_steps")
    op.drop_index("ix_recipe_ingredients_recipe_id", table_name="recipe_ingredients")
    op.drop_table("recipe_ingredients")
    op.drop_table("tags")
    op.drop_table("recipes")
