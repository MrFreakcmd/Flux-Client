"""Add is_suspended field to User model for enhanced user management.

Revision ID: 002
Revises: 001
Create Date: 2026-07-06 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_suspended column to users table
    op.add_column('users', sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove is_suspended column from users table
    op.drop_column('users', 'is_suspended')
