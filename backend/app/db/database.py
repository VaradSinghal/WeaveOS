"""
database.py — Supabase client factory.
All DB access goes through the Supabase PostgREST client.
"""
from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache(maxsize=1)
def _get_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_db() -> Client:
    """FastAPI dependency — yields a shared Supabase client."""
    return _get_client()
