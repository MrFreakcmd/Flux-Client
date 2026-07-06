# Alembic Migration Guide for Flux-Client

## Quick Reference

### Running Migrations (on CasaOS or in Docker)

```bash
# Upgrade to latest migration
alembic upgrade head

# Downgrade one migration
alembic downgrade -1

# View migration history
alembic history

# Current database version
alembic current
```

### Creating a New Migration After Model Changes

**Locally (on your machine):**
```bash
cd backend
./venv/Scripts/Activate.ps1  # or source venv/bin/activate on Mac/Linux
python -m alembic revision --autogenerate -m "Your descriptive message"
```

This creates a new file in `backend/migrations/versions/` with auto-detected changes.

**Then review the migration file** before committing — auto-generated migrations sometimes miss edge cases.

### In Docker (on CasaOS)

```bash
# Generate migration
docker exec flux_backend alembic revision --autogenerate -m "Your message"

# Apply all pending migrations
docker exec flux_backend alembic upgrade head
```

## Current Migrations

- **001_initial_schema** - Baseline (no-op, tables already exist)
- **002_add_is_suspended_to_user** - Adds `is_suspended` column to `users` table

## How to Fix the Current Issue

Run this on CasaOS to add the missing column:

```bash
docker exec flux_backend alembic upgrade head
```

Or manually:
```bash
docker exec flux_db psql -U postgres -d flux_client -c "ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE NOT NULL;"
```

## Preventing Future Issues

1. **Always include migrations in commits** when you modify SQLAlchemy models
2. **Test migrations locally** before deploying:
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head  # Verify it works both ways
   ```
3. **Review auto-generated migrations** — they can sometimes be incomplete
4. **Never manually alter the database** without a migration (so the model/DB stay in sync)

## Configuration

- **Config file**: `backend/alembic.ini`
- **Migration scripts**: `backend/migrations/versions/`
- **Environment**: `backend/migrations/env.py` (reads DB URL from `.env` via settings)

## Troubleshooting

**"Target database is not up to date"**
- Run: `alembic upgrade head`

**Connection refused**
- Make sure PostgreSQL is running
- Check `.env` has correct `POSTGRES_*` settings

**Migration doesn't detect my model change**
- Alembic's auto-detection has limitations (some constraints, check additions)
- Edit the migration file manually or rewrite it with explicit SQL
