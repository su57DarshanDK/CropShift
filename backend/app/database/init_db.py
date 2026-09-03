"""
init_db.py -- Creates the PostGIS extension and all A1 tables.

Usage:
    python -m app.database.init_db

This script is idempotent: running it multiple times is safe.
Tables are created with CREATE TABLE IF NOT EXISTS (via SQLAlchemy's create_all).
"""
import logging

from sqlalchemy import text

from .session import engine
from .base import Base

# Import all models so their metadata is registered with Base
import app.models  # noqa: F401

logger = logging.getLogger(__name__)


def init_db() -> None:
    """Enable PostGIS and create all tables."""
    logger.info("Enabling PostGIS extension...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    logger.info("PostGIS enabled.")

    logger.info("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("All tables created (or already exist).")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    print("Database initialised successfully.")
