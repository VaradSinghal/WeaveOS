"""
orders.py — CRUD endpoints for orders and production logs.
Uses Supabase PostgREST client.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.database import get_db
from app.models.schemas import OrderWithPrediction, ProductionLogOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderWithPrediction], summary="List all orders with latest prediction")
def list_orders(db: Client = Depends(get_db)):
    # Fetch orders and all predictions in 2 queries, join in Python
    orders_resp = db.table("orders").select("*").order("created_at", desc=False).execute()
    preds_resp = (
        db.table("predictions")
        .select("*")
        .order("predicted_at", desc=True)
        .execute()
    )

    # Build map: order_id → latest prediction (already ordered desc by predicted_at)
    pred_map: dict = {}
    for p in preds_resp.data:
        if p["order_id"] not in pred_map:
            pred_map[p["order_id"]] = p

    result = []
    for order in orders_resp.data:
        pred = pred_map.get(order["order_id"])
        result.append(
            OrderWithPrediction(
                order_id=order["order_id"],
                product_name=order["product_name"],
                quantity=order["quantity"],
                start_date=order["start_date"],
                due_date=order["due_date"],
                prediction=pred,
            )
        )
    return result


@router.get("/{order_id}", response_model=OrderWithPrediction, summary="Get a single order with prediction")
def get_order(order_id: str, db: Client = Depends(get_db)):
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

    return OrderWithPrediction(
        order_id=order["order_id"],
        product_name=order["product_name"],
        quantity=order["quantity"],
        start_date=order["start_date"],
        due_date=order["due_date"],
        prediction=pred,
    )


@router.get("/{order_id}/logs", response_model=list[ProductionLogOut], summary="Get production logs for an order")
def get_logs(order_id: str, db: Client = Depends(get_db)):
    order_resp = db.table("orders").select("order_id").eq("order_id", order_id).execute()
    if not order_resp.data:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    logs_resp = (
        db.table("production_logs")
        .select("*")
        .eq("order_id", order_id)
        .order("log_date", desc=False)
        .execute()
    )
    return [ProductionLogOut(**row) for row in logs_resp.data]


@router.delete("/{order_id}", summary="Delete an order and its logs/predictions")
def delete_order(order_id: str, db: Client = Depends(get_db)):
    order_resp = db.table("orders").select("order_id").eq("order_id", order_id).execute()
    if not order_resp.data:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    # CASCADE on FK handles logs + predictions deletion automatically
    db.table("orders").delete().eq("order_id", order_id).execute()
    return {"message": f"Order {order_id} deleted."}
