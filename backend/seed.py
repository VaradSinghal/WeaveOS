"""
seed.py — Seed Supabase with sample data and run initial predictions.
Run from the backend/ directory: python seed.py
"""
import sys
import os
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import get_db
from app.services.parser import parse_orders, parse_production_logs
from app.services.ml import train_model
from app.services.features import compute_features
from app.services.ml import predict_delay


def _iso(d) -> str | None:
    if d is None:
        return None
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def seed():
    print("Training / loading ML model…")
    train_model()

    db = get_db()
    data_dir = os.path.join(os.path.dirname(__file__), "data")

    # ── Orders ────────────────────────────────────────────────────────────────
    orders_path = os.path.join(data_dir, "sample_orders.csv")
    with open(orders_path, "rb") as f:
        records = parse_orders(f.read(), "sample_orders.csv")

    import random
    rows = [
        {
            "order_id": r["order_id"],
            "product_name": r["product_name"],
            "quantity": r["quantity"],
            "yarn_cost": round(random.uniform(15.0, 50.0), 2),
            "start_date": _iso(r["start_date"]),
            "due_date": _iso(r["due_date"]),
        }
        for r in records
    ]
    db.table("orders").upsert(rows, on_conflict="order_id").execute()
    print(f"  Upserted {len(rows)} orders.")

    # ── Production Logs ───────────────────────────────────────────────────────
    logs_path = os.path.join(data_dir, "sample_production_logs.csv")
    with open(logs_path, "rb") as f:
        log_records = parse_production_logs(f.read(), "sample_production_logs.csv")

    log_rows = [
        {
            "order_id": r["order_id"],
            "log_date": _iso(r["log_date"]),
            "daily_production": r["daily_production"],
            "machine_assigned": r.get("machine_assigned"),
        }
        for r in log_records
    ]
    db.table("production_logs").upsert(log_rows, on_conflict="order_id,log_date").execute()
    print(f"  Upserted {len(log_rows)} production log rows.")

    # ── Predictions ───────────────────────────────────────────────────────────
    orders_resp = db.table("orders").select("*").execute()
    pred_rows = []
    for order in orders_resp.data:
        logs_resp = db.table("production_logs").select("*").eq("order_id", order["order_id"]).execute()
        feats = compute_features(
            order_quantity=order["quantity"],
            start_date=date.fromisoformat(order["start_date"]),
            due_date=date.fromisoformat(order["due_date"]),
            logs=logs_resp.data,
        )
        result = predict_delay(feats)
        pred_rows.append({
            "order_id": order["order_id"],
            "predicted_at": datetime.now(timezone.utc).isoformat(),
            "delay_probability": result["delay_probability"],
            "risk_status": result["risk_status"],
            "pct_completion": feats["pct_completion"],
            "pct_time_elapsed": feats["pct_time_elapsed"],
            "required_speed": feats["required_speed"],
            "actual_speed": feats["actual_speed"],
        })

    db.table("predictions").insert(pred_rows).execute()
    print(f"  Generated {len(pred_rows)} predictions.")

    # ── Summary ───────────────────────────────────────────────────────────────
    from collections import Counter
    counts = Counter(p["risk_status"] for p in pred_rows)
    print("\n── Risk Summary ──────────────────────────────")
    for status, count in sorted(counts.items()):
        print(f"  {status}: {count}")
    print("─────────────────────────────────────────────")
    print("\n✅ Seed complete. Start the server with:")
    print("   uvicorn app.main:app --reload\n")


if __name__ == "__main__":
    seed()
