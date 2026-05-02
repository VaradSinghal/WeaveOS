"use client";

import { OrderAlert } from "@/lib/api";
import { MessageCircle, Bell, Wifi } from "lucide-react";

interface AlertsPanelProps {
  alerts: OrderAlert[];
  loading?: boolean;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function AlertsPanel({ alerts, loading }: AlertsPanelProps) {
  const highRisk = alerts.filter((a) => a.risk_status === "High Risk");
  const atRisk = alerts.filter((a) => a.risk_status === "At Risk");

  return (
    <div className="wa-panel fade-in">
      {/* WhatsApp-style header */}
      <div className="wa-header">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bell size={18} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="wa-header-title">WeaveOS Alert Bot</div>
          <div className="wa-header-sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Wifi size={10} />
            {loading
              ? "Fetching alerts…"
              : `${alerts.length} active alert${alerts.length !== 1 ? "s" : ""} · ${highRisk.length} high risk`}
          </div>
        </div>
        {alerts.length > 0 && (
          <span className="alert-count-badge">{alerts.length}</span>
        )}
      </div>

      {/* Message feed */}
      <div className="wa-body">
        {loading ? (
          <div className="wa-empty">
            <div className="spinner" style={{ margin: "0 auto 0.75rem" }} />
            Loading alerts…
          </div>
        ) : alerts.length === 0 ? (
          <div className="wa-empty">
            <MessageCircle size={28} style={{ margin: "0 auto 0.5rem", display: "block", opacity: 0.3 }} />
            No active alerts — all orders on track ✅
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.order_id}
              className={`wa-bubble ${alert.risk_status === "High Risk" ? "high-risk" : "at-risk"}`}
            >
              <div className="wa-bubble-header">
                <span style={{ fontSize: "1rem" }}>
                  {alert.risk_status === "High Risk" ? "🔴" : "🟡"}
                </span>
                <span className="wa-bubble-order">{alert.order_id}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: alert.risk_status === "High Risk" ? "var(--red)" : "var(--amber)",
                  }}
                >
                  {(alert.delay_probability * 100).toFixed(0)}% risk
                </span>
              </div>
              <div className="wa-bubble-body">{alert.alert_message}</div>
              <div className="wa-bubble-time">{formatTime(alert.generated_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
