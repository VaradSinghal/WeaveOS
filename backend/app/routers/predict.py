"""
predict.py — Prediction endpoints.
Uses Supabase PostgREST client.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.database import get_db
from app.models.schemas import PredictionOut
from app.services.features import compute_features
from app.services.ml import predict_delay

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["predict"])


def _fetch_order(order_id: str, db: Client) -> dict:
    resp = db.table("orders").select("*").eq("order_id", order_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return resp.data[0]


def _fetch_logs(order_id: str, db: Client) -> list[dict]:
    resp = db.table("production_logs").select("*").eq("order_id", order_id).execute()
    return resp.data


def _run_prediction(order: dict, db: Client) -> dict:
    from datetime import date
    logs = _fetch_logs(order["order_id"], db)
    feats = compute_features(
        order_quantity=order["quantity"],
        start_date=date.fromisoformat(order["start_date"]),
        due_date=date.fromisoformat(order["due_date"]),
        logs=logs,  # dicts with "daily_production" key
    )
    result = predict_delay(feats, yarn_cost=order.get("yarn_cost", 20.0))

    pred_row = {
        "order_id": order["order_id"],
        "predicted_at": datetime.now(timezone.utc).isoformat(),
        "delay_probability": result["delay_probability"],
        "risk_status": result["risk_status"],
        "pct_completion": feats["pct_completion"],
        "pct_time_elapsed": feats["pct_time_elapsed"],
        "required_speed": feats["required_speed"],
        "actual_speed": feats["actual_speed"],
        "explanation": result.get("explanation"),
        "expected_cost": result.get("expected_cost"),
        "expected_revenue": result.get("expected_revenue"),
        "margin": result.get("margin"),
        "margin_status": result.get("margin_status"),
    }
    db.table("predictions").insert(pred_row).execute()
    return pred_row


@router.post("/{order_id}", response_model=PredictionOut, summary="Predict delay for one order")
def predict_one(order_id: str, db: Client = Depends(get_db)):
    order = _fetch_order(order_id, db)
    pred = _run_prediction(order, db)
    return PredictionOut(**pred)


@router.post("/all/batch", response_model=list[PredictionOut], summary="Predict delay for all orders")
def predict_all(db: Client = Depends(get_db)):
    orders_resp = db.table("orders").select("*").execute()
    if not orders_resp.data:
        raise HTTPException(status_code=404, detail="No orders in database. Upload data first.")

    results = []
    for order in orders_resp.data:
        try:
            pred = _run_prediction(order, db)
            results.append(PredictionOut(**pred))
        except Exception as exc:
            logger.warning("Prediction failed for %s: %s", order["order_id"], exc)
    return results


@router.get("/history/{order_id}", response_model=list[PredictionOut], summary="Prediction history for an order")
def prediction_history(order_id: str, db: Client = Depends(get_db)):
    resp = (
        db.table("predictions")
        .select("*")
        .eq("order_id", order_id)
        .order("predicted_at", desc=True)
        .limit(30)
        .execute()
    )
    return [PredictionOut(**row) for row in resp.data]
