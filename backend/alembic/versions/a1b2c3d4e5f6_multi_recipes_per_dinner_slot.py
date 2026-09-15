"""Allow multiple recipes per dinner day via position.

Revision ID: a1b2c3d4e5f6
Revises: 9d2f7c1dd34c
Create Date: 2026-09-14 10:46:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9d2f7c1dd34c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_dinner_slots_week_day", "dinner_slots", type_="unique")
    op.create_unique_constraint(
        "uq_dinner_slots_week_day_recipe",
        "dinner_slots",
        ["week_start", "day_of_week", "recipe_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_dinner_slots_week_day_recipe", "dinner_slots", type_="unique"
    )
    # Collapse to one row per day before restoring the old unique constraint.
    # Keep the lowest id when duplicates exist.
    op.execute(
        """
        DELETE FROM dinner_slots
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM dinner_slots
            GROUP BY week_start, day_of_week
        )
        """
    )
    op.create_unique_constraint(
        "uq_dinner_slots_week_day",
        "dinner_slots",
        ["week_start", "day_of_week"],
    )
