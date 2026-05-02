"use client";

import { LoomStatus } from "@/lib/api";
import { Activity, Thermometer, Zap, Clock, Package } from "lucide-react";

interface LoomCardProps {
  loom: LoomStatus;
}

export default function LoomCard({ loom }: LoomCardProps) {
  const isRunning = loom.status === "Running";
  
  const statusColor = 
    loom.status === "Running" ? "var(--green)" : 
    loom.status === "Maintenance" ? "var(--primary)" : 
    "var(--amber)";

  return (
    <div className="card fade-in" style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
      {/* Status indicator bar */}
      <div 
        style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          bottom: 0, 
          width: "4px", 
          background: statusColor 
        }} 
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <h3 className="text-title-lg" style={{ color: "var(--ink)" }}>{loom.loom_id}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
            <span className="text-caption-sm" style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              {loom.status}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="text-display-sm" style={{ color: isRunning ? "var(--ink)" : "var(--muted)" }}>
            {loom.efficiency}%
          </div>
          <div className="text-caption-sm" style={{ color: "var(--muted)" }}>Busyness</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ color: "var(--muted)" }}><Package size={16} /></div>
          <div>
            <div className="text-caption-sm" style={{ color: "var(--muted)" }}>Production</div>
            <div className="text-title-sm">{loom.daily_production} units</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ color: "var(--muted)" }}><Clock size={16} /></div>
          <div>
            <div className="text-caption-sm" style={{ color: "var(--muted)" }}>Uptime</div>
            <div className="text-title-sm">{loom.uptime_hours} hrs</div>
          </div>
        </div>
      </div>

      {isRunning && loom.current_order && (
        <div style={{ 
          background: "var(--surface-soft)", 
          padding: "0.75rem", 
          borderRadius: "8px", 
          marginBottom: "1.25rem",
          border: "1px solid var(--hairline-soft)"
        }}>
          <div className="text-caption-sm" style={{ color: "var(--muted)", marginBottom: "2px" }}>Active Order</div>
          <div className="text-title-sm" style={{ color: "var(--blue)", fontFamily: "monospace" }}>{loom.current_order}</div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--hairline-soft)", paddingTop: "1rem", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Activity size={14} color="var(--muted)" />
          <span className="text-caption-sm" style={{ color: "var(--muted)" }}>{loom.vibration_level} mm/s</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Thermometer size={14} color="var(--muted)" />
          <span className="text-caption-sm" style={{ color: "var(--muted)" }}>{loom.temperature}°C</span>
        </div>
      </div>
    </div>
  );
}
