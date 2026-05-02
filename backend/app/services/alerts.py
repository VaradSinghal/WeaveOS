"""
alerts.py — Alert and recommendation engine.
Derives alerts from prediction data; no DB writes required.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.models.schemas import OrderAlert, RecommendationItem

# ── Thresholds ────────────────────────────────────────────────────────────────
HIGH_RISK_THRESHOLD = 0.70        # delay_probability > this → HIGH RISK alert
SPEED_RATIO_RESCHEDULE = 2.0      # required / actual > this → reschedule
CRITICAL_LAG_TIME = 70            # pct_time_elapsed > this with low completion
CRITICAL_LAG_COMPLETION = 25      # pct_completion < this


def generate_alert(order: dict, prediction: dict) -> Optional[OrderAlert]:
    """
    Generate an alert for an order.
    Returns None when the order is on-track (prob ≤ 0.35).
    """
    if not prediction:
        return None

    prob = prediction["delay_probability"]
    risk_status = prediction["risk_status"]

    # On Track orders do not generate alerts
    if risk_status == "On Track":
        return None

    actual = prediction["actual_speed"]
    required = prediction["required_speed"]
    pct_comp = prediction["pct_completion"]
    pct_time = prediction["pct_time_elapsed"]

    recommendations: list[RecommendationItem] = []

    # ── Rule 1: Actual speed insufficient ───────────────────────────────────
    if actual < required:
        speed_ratio = required / (actual + 1e-6)

        # ── Rule 2: Backlog so high that need 2× current throughput ─────────
        if speed_ratio >= SPEED_RATIO_RESCHEDULE:
            recommendations.append(
                RecommendationItem(
                    code="RESCHEDULE",
                    text=(
                        f"Reschedule lower priority orders to free capacity — "
                        f"need {required:.1f} u/day but achieving {actual:.1f} u/day "
                        f"({speed_ratio:.1f}× gap)"
                    ),
                    priority="high",
                )
            )

        recommendations.append(
            RecommendationItem(
                code="INCREASE_LOOMS",
                text=(
                    f"Increase loom allocation — current {actual:.1f} u/day, "
                    f"required {required:.1f} u/day to finish on time"
                ),
                priority="high" if prob > HIGH_RISK_THRESHOLD else "medium",
            )
        )

    # ── Rule 3: Critical timeline breach ────────────────────────────────────
    if pct_time >= CRITICAL_LAG_TIME and pct_comp < CRITICAL_LAG_COMPLETION:
        recommendations.append(
            RecommendationItem(
                code="ESCALATE",
                text=(
                    f"Escalate to production manager — only {pct_comp:.0f}% complete "
                    f"with {pct_time:.0f}% of time elapsed"
                ),
                priority="high",
            )
        )

    # ── Fallback: generic advice when no specific rule triggered ─────────────
    if not recommendations:
        recommendations.append(
            RecommendationItem(
                code="MONITOR",
                text="Monitor closely — delay risk elevated. Review daily production targets.",
                priority="medium",
            )
        )

    return OrderAlert(
        order_id=order["order_id"],
        product_name=order["product_name"],
        risk_status=risk_status,
        delay_probability=prob,
        actual_speed=actual,
        required_speed=required,
        pct_completion=pct_comp,
        pct_time_elapsed=pct_time,
        recommendations=recommendations,
        alert_message=_format_whatsapp_message(order, prediction, recommendations),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _format_whatsapp_message(order: dict, prediction: dict, recommendations: list[RecommendationItem]) -> str:
    prob = prediction["delay_probability"]
    risk = prediction["risk_status"]
    pct_comp = prediction["pct_completion"]
    pct_time = prediction["pct_time_elapsed"]

    icon = "🔴" if risk == "High Risk" else "🟡"
    header = f"{icon} *{risk.upper()} ALERT*"

    rec_lines = "\n".join(f"  • {r.text}" for r in recommendations)

    msg = (
        f"{header}\n"
        f"─────────────────────────\n"
        f"📦 Order: {order['order_id']}\n"
        f"🏭 Product: {order['product_name']}\n"
        f"📊 Delay Probability: {prob * 100:.0f}%\n"
        f"─────────────────────────\n"
        f"⚠️ Recommendations:\n{rec_lines}\n"
        f"─────────────────────────\n"
        f"✅ Completion: {pct_comp:.0f}%  |  ⏱ Time Elapsed: {pct_time:.0f}%"
    )
    return msg
