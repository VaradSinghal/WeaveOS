"""
ml.py — XGBoost delay & cost prediction models.
Trains on synthetic data; persists / loads from disk.
"""
from __future__ import annotations

import logging
import os

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, mean_absolute_error
from xgboost import XGBClassifier, XGBRegressor

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

COST_FEATURE_COLS = [
    "quantity",
    "yarn_cost",
    "pct_completion",
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
    
    # Synthetic Cost Data
    yarn_cost = rng.uniform(15.0, 50.0, n)
    base_cost = quantity * yarn_cost
    machine_hours = (quantity / (actual_speed + 1)) * 24 
    machine_cost = machine_hours * 5.0 # $5 per hour
    total_cost = base_cost + machine_cost + rng.uniform(100, 1000, n)

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
            "yarn_cost": yarn_cost,
            "total_cost": total_cost
        }
    )


# ── Model lifecycle ───────────────────────────────────────────────────────────

def train_model(force: bool = False) -> tuple[XGBClassifier, XGBRegressor, shap.TreeExplainer]:
    model_path = settings.MODEL_PATH
    cost_model_path = model_path.replace(".pkl", "_cost.pkl")
    explainer_path = model_path.replace(".pkl", "_explainer.pkl")

    if not force and os.path.exists(model_path) and os.path.exists(cost_model_path) and os.path.exists(explainer_path):
        logger.info("Loading persisted XGBoost models from %s", model_path)
        return joblib.load(model_path), joblib.load(cost_model_path), joblib.load(explainer_path)

    logger.info("Training XGBoost delay & cost prediction models on synthetic data…")
    df = _generate_synthetic_data(4000)
    
    # Train Delay Classifier
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
    logger.info("Delay Model trained:\n%s", report)
    
    # Create SHAP Explainer
    explainer = shap.TreeExplainer(model)
    
    # Train Cost Regressor
    Xc, yc = df[COST_FEATURE_COLS], df["total_cost"]
    Xc_tr, Xc_te, yc_tr, yc_te = train_test_split(Xc, yc, test_size=0.2, random_state=42)
    
    cost_model = XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    cost_model.fit(Xc_tr, yc_tr, eval_set=[(Xc_te, yc_te)], verbose=False)
    mae = mean_absolute_error(yc_te, cost_model.predict(Xc_te))
    logger.info(f"Cost Model trained. MAE: {mae:.2f}")

    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump(model, model_path)
    joblib.dump(cost_model, cost_model_path)
    joblib.dump(explainer, explainer_path)
    logger.info("Models saved to %s", model_path)
    
    return model, cost_model, explainer


def generate_explanation(shap_values, features: dict) -> str:
    """Generate a human readable explanation from SHAP values."""
    # SHAP values for class 1 (delay)
    # The higher the shap value, the more it pushes the prediction towards "Delay"
    feature_names = FEATURE_COLS
    
    # If the model outputs a list of arrays (for multi-class), use index 1.
    # For binary classification in xgboost, shap_values.values is usually (n_samples, n_features)
    vals = shap_values.values[0]
    if len(vals.shape) > 1:
        vals = vals[:, 1] # Fallback just in case
        
    # Get top 2 features contributing to delay
    top_indices = np.argsort(vals)[-2:][::-1]
    
    reasons = []
    for idx in top_indices:
        val = vals[idx]
        if val <= 0:
            continue # Not contributing to delay
            
        fname = feature_names[idx]
        fval = features[fname]
        
        if fname == "speed_ratio":
            reasons.append(f"required speed is {fval:.1f}x higher than actual speed")
        elif fname == "completion_lag":
            reasons.append(f"completion is lagging {fval:.1f}% behind time elapsed")
        elif fname == "actual_speed":
            reasons.append(f"actual production speed ({fval:.0f}/day) is too low")
        elif fname == "pct_completion":
            reasons.append(f"overall completion is only {fval:.1f}%")
        elif fname == "days_remaining":
            reasons.append(f"only {fval} days remaining")
            
    if not reasons:
        return "Multiple minor factors indicate risk."
        
    return "Delay risk is high because " + " and ".join(reasons) + "."


def predict_delay(features: dict, yarn_cost: float = 20.0) -> dict:
    """
    Run inference on a pre-computed feature dict.
    Returns prediction and margin data.
    """
    model, cost_model, explainer = train_model()

    row = {col: features.get(col, 0) for col in FEATURE_COLS}
    X = pd.DataFrame([row])

    prob = float(model.predict_proba(X)[0, 1])

    explanation = None
    if prob < 0.35:
        status = "On Track"
    elif prob < 0.65:
        status = "At Risk"
        shap_values = explainer(X)
        explanation = generate_explanation(shap_values, features)
    else:
        status = "High Risk"
        shap_values = explainer(X)
        explanation = generate_explanation(shap_values, features)

    # Cost Prediction
    cost_row = {
        "quantity": features.get("quantity", 0),
        "yarn_cost": yarn_cost,
        "pct_completion": features.get("pct_completion", 0)
    }
    Xc = pd.DataFrame([cost_row])
    expected_cost = float(cost_model.predict(Xc)[0])
    
    expected_revenue = float(features.get("quantity", 0)) * (yarn_cost * 2.5)
    margin = expected_revenue - expected_cost
    margin_pct = margin / expected_revenue if expected_revenue > 0 else 0
    
    if margin_pct < 0.15:
        margin_status = "Low margin"
    elif margin_pct < 0.25:
        margin_status = "Margin dropping"
    else:
        margin_status = "Healthy"

    return {
        "delay_probability": round(prob, 4), 
        "risk_status": status,
        "explanation": explanation,
        "expected_cost": round(expected_cost, 2),
        "expected_revenue": round(expected_revenue, 2),
        "margin": round(margin, 2),
        "margin_status": margin_status
    }
