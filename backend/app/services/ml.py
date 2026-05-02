"""
ml.py — XGBoost delay prediction model.
Trains on synthetic data; persists / loads from disk.
"""
from __future__ import annotations

import logging
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from xgboost import XGBClassifier

from app.config import settings

logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "pct_completion",
    "pct_time_elapsed",
    "actual_speed",
    "required_speed",
    "speed_ratio",
    "completion_lag",
    "days_remaining",
    "quantity",
]


# ── Synthetic training data ───────────────────────────────────────────────────

def _generate_synthetic_data(n: int = 4000) -> pd.DataFrame:
    rng = np.random.default_rng(42)

    quantity = rng.integers(500, 20_000, n).astype(float)
    pct_time_elapsed = rng.uniform(5, 100, n)
    pct_completion = np.clip(
        pct_time_elapsed - rng.uniform(-20, 45, n), 0, 100
    )
    days_elapsed = np.maximum(1, (pct_time_elapsed / 100 * 90).astype(int))
    days_remaining = np.maximum(1, rng.integers(1, 90, n))

    produced = quantity * pct_completion / 100
    actual_speed = produced / days_elapsed
    remaining = np.maximum(0, quantity - produced)
    required_speed = remaining / days_remaining
    speed_ratio = required_speed / (actual_speed + 1e-6)
    completion_lag = pct_time_elapsed - pct_completion

    # Multi-factor delay label
    delayed = (
        (speed_ratio > 1.4)
        | (completion_lag > 22)
        | ((days_remaining < 7) & (pct_completion < 75))
    ).astype(int)

    # 5 % label noise to prevent over-fitting
    noise = rng.random(n) < 0.05
    delayed[noise] = 1 - delayed[noise]

    return pd.DataFrame(
        {
            "pct_completion": pct_completion,
            "pct_time_elapsed": pct_time_elapsed,
            "actual_speed": actual_speed,
            "required_speed": required_speed,
            "speed_ratio": speed_ratio,
            "completion_lag": completion_lag,
            "days_remaining": days_remaining,
            "quantity": quantity,
            "delayed": delayed,
        }
    )


# ── Model lifecycle ───────────────────────────────────────────────────────────

def train_model(force: bool = False) -> XGBClassifier:
    model_path = settings.MODEL_PATH

    if not force and os.path.exists(model_path):
        logger.info("Loading persisted XGBoost model from %s", model_path)
        return joblib.load(model_path)

    logger.info("Training XGBoost delay prediction model on synthetic data…")
    df = _generate_synthetic_data(4000)
    X, y = df[FEATURE_COLS], df["delayed"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

    report = classification_report(y_te, model.predict(X_te))
    logger.info("Model trained:\n%s", report)

    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump(model, model_path)
    logger.info("Model saved to %s", model_path)
    return model


def predict_delay(features: dict) -> dict:
    """
    Run inference on a pre-computed feature dict.
    Returns { delay_probability, risk_status }.
    """
    model = train_model()

    row = {col: features[col] for col in FEATURE_COLS}
    X = pd.DataFrame([row])

    prob = float(model.predict_proba(X)[0, 1])

    if prob < 0.35:
        status = "On Track"
    elif prob < 0.65:
        status = "At Risk"
    else:
        status = "High Risk"

    return {"delay_probability": round(prob, 4), "risk_status": status}
