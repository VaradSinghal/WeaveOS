"""
main.py — FastAPI application entry point.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alerts, ingest, orders, predict
from app.services.ml import train_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WeaveOS Delay Prediction API",
    description="AI-powered delay prediction for textile factory orders. Backed by Supabase.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(orders.router)
app.include_router(predict.router)
app.include_router(alerts.router)


@app.on_event("startup")
async def startup():
    logger.info("Pre-loading / training XGBoost model…")
    train_model()
    logger.info("WeaveOS API ready — connected to Supabase.")


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "WeaveOS Delay Prediction API", "db": "Supabase"}
