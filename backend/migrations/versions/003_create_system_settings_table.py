"""Create system_settings table for application branding and configuration.

Revision ID: 003
Revises: 002
Create Date: 2026-07-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', postgresql.JSONB(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )


def downgrade() -> None:
    # Drop system_settings table
    op.drop_table('system_settings')
