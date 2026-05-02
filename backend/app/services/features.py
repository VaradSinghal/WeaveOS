"""
features.py — Compute ML feature vector for a given order + production logs.
"""
from __future__ import annotations

from datetime import date
from typing import Sequence


def compute_features(
    order_quantity: int,
    start_date: date,
    due_date: date,
    logs: Sequence,          # ORM ProductionLog objects or dicts with daily_production
    today: date | None = None,
) -> dict:
    """
    Returns:
        pct_completion      – % of total quantity produced
        pct_time_elapsed    – % of order timeline consumed
        actual_speed        – units produced per day (historical)
        required_speed      – units per day needed to finish on time
        speed_ratio         – required / actual (>1 means falling behind)
        completion_lag      – pct_time_elapsed - pct_completion
        days_remaining      – calendar days until due_date
        quantity            – total order quantity
    """
    if today is None:
        today = date.today()

    total_days = max(1, (due_date - start_date).days)
    days_elapsed = max(1, (today - start_date).days)
    days_remaining = max(1, (due_date - today).days)

    # Support both ORM objects and plain dicts
    def _prod(log) -> int:
        return log["daily_production"] if isinstance(log, dict) else log.daily_production

    total_produced = sum(_prod(l) for l in logs)

    pct_completion = min(100.0, (total_produced / order_quantity) * 100)
    pct_time_elapsed = min(100.0, (days_elapsed / total_days) * 100)
    actual_speed = total_produced / days_elapsed
    remaining = max(0, order_quantity - total_produced)
    required_speed = remaining / days_remaining

    speed_ratio = required_speed / (actual_speed + 1e-6)
    completion_lag = pct_time_elapsed - pct_completion

    return {
        "pct_completion": round(pct_completion, 4),
        "pct_time_elapsed": round(pct_time_elapsed, 4),
        "actual_speed": round(actual_speed, 4),
        "required_speed": round(required_speed, 4),
        "speed_ratio": round(speed_ratio, 4),
        "completion_lag": round(completion_lag, 4),
        "days_remaining": days_remaining,
        "quantity": order_quantity,
    }
