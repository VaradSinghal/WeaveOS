"use client";

import { OrderAlert } from "@/lib/api";
import { Bell } from "lucide-react";

interface AlertsPanelProps {
  alerts: OrderAlert[];
  loading?: boolean;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function AlertsPanel({ alerts, loading }: AlertsPanelProps) {
  return (
    <div className="card fade-in" style={{ padding: "0" }}>
      {/* Header */}
      <div
        style={{
          padding: "var(--spacing-lg)",
          borderBottom: "1px solid var(--hairline)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Bell size={24} color="var(--ink)" />
        <div>
          <h2 className="text-display-sm" style={{ color: "var(--ink)" }}>Alerts</h2>
          <div className="text-body-sm" style={{ color: "var(--muted)", marginTop: "4px" }}>
            {loading ? "Fetching alerts…" : `${alerts.length} active alerts`}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "var(--spacing-lg)", display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", maxHeight: "calc(100vh - 400px)", overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-xl) 0" }}>
            <div className="spinner" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-body-md" style={{ color: "var(--muted)", textAlign: "center", padding: "var(--spacing-xl) 0" }}>
            No active alerts — all orders on track
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={alert.order_id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                paddingBottom: index === alerts.length - 1 ? 0 : "var(--spacing-lg)",
                borderBottom: index === alerts.length - 1 ? "none" : "1px solid var(--hairline-soft)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: alert.risk_status === "High Risk" ? "var(--primary)" : "var(--amber)",
                    }}
                  />
                  <span className="text-title-md">{alert.order_id}</span>
                </div>
                <span className="text-caption-sm" style={{ color: "var(--muted)" }}>
                  {formatTime(alert.generated_at)}
                </span>
              </div>
              <div className="text-body-md">
                {alert.alert_message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
