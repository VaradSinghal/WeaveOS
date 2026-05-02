from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


# ── Orders ──────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    order_id: str
    product_name: str
    quantity: int
    yarn_cost: float = 20.0
    start_date: date
    due_date: date


class OrderOut(BaseModel):
    order_id: str
    product_name: str
    quantity: int
    yarn_cost: float = 20.0
    start_date: date
    due_date: date
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Production Logs ──────────────────────────────────────────────────────────
class ProductionLogCreate(BaseModel):
    order_id: str
    log_date: date
    daily_production: int
    machine_assigned: Optional[str] = None


class ProductionLogOut(BaseModel):
    order_id: str
    log_date: date
    daily_production: int
    machine_assigned: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Predictions ──────────────────────────────────────────────────────────────
class PredictionOut(BaseModel):
    order_id: str
    delay_probability: float
    risk_status: str
    pct_completion: float
    pct_time_elapsed: float
    required_speed: float
    actual_speed: float
    explanation: Optional[str] = None
    expected_cost: Optional[float] = None
    expected_revenue: Optional[float] = None
    margin: Optional[float] = None
    margin_status: Optional[str] = None
    predicted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Order with latest prediction (for dashboard) ─────────────────────────────
class OrderWithPrediction(BaseModel):
    order_id: str
    product_name: str
    quantity: int
    yarn_cost: float = 20.0
    start_date: date
    due_date: date
    prediction: Optional[PredictionOut] = None

    model_config = {"from_attributes": True}


# ── OCR result ───────────────────────────────────────────────────────────────
class OCRResult(BaseModel):
    order_id: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    raw_text: Optional[str] = None
    confidence: float = 0.0


# ── Alerts & Recommendations ─────────────────────────────────────────────────
class RecommendationItem(BaseModel):
    code: str           # INCREASE_LOOMS | RESCHEDULE | ESCALATE | MONITOR
    text: str           # Human-readable recommendation
    priority: str       # "high" | "medium"


class OrderAlert(BaseModel):
    order_id: str
    product_name: str
    risk_status: str
    delay_probability: float
    actual_speed: float
    required_speed: float
    pct_completion: float
    pct_time_elapsed: float
    recommendations: list[RecommendationItem]
    alert_message: str          # WhatsApp-style formatted message
    generated_at: str
