"""
alerts.py — Alerts router.
Computes alerts on-the-fly from the latest predictions; no additional DB writes.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.database import get_db
from app.models.schemas import OrderAlert
from app.services.alerts import generate_alert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


def _build_pred_map(db: Client) -> dict:
    """Fetch latest prediction per order in a single query."""
    preds_resp = (
        db.table("predictions")
        .select("*")
        .order("predicted_at", desc=True)
        .execute()
    )
    pred_map: dict = {}
    for p in preds_resp.data:
        if p["order_id"] not in pred_map:
            pred_map[p["order_id"]] = p
    return pred_map


@router.get("", response_model=list[OrderAlert], summary="Get all active alerts")
def list_alerts(db: Client = Depends(get_db)):
    """
    Returns alerts for every order that is At Risk or High Risk.
    Sorted: High Risk first, then by delay_probability desc.
    """
    orders_resp = db.table("orders").select("*").execute()
    pred_map = _build_pred_map(db)

    alerts = []
    for order in orders_resp.data:
        pred = pred_map.get(order["order_id"])
        alert = generate_alert(order, pred)
        if alert:
            alerts.append(alert)

    # High Risk first, then At Risk, then by probability desc
    priority = {"High Risk": 0, "At Risk": 1}
    alerts.sort(key=lambda a: (priority.get(a.risk_status, 2), -a.delay_probability))
    return alerts


@router.get("/{order_id}", response_model=OrderAlert, summary="Get alert for a specific order")
def get_alert(order_id: str, db: Client = Depends(get_db)):
    order_resp = db.table("orders").select("*").eq("order_id", order_id).execute()
    if not order_resp.data:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    order = order_resp.data[0]
    pred_resp = (
        db.table("predictions")
        .select("*")
        .eq("order_id", order_id)
        .order("predicted_at", desc=True)
        .limit(1)
        .execute()
    )
    pred = pred_resp.data[0] if pred_resp.data else None
    alert = generate_alert(order, pred)

    if not alert:
        raise HTTPException(
            status_code=404,
            detail=f"No alert for {order_id} — order is On Track or has no prediction.",
        )
    return alert
