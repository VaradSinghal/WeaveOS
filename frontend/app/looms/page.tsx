"use client";

import { useState, useEffect, useCallback } from "react";
import { api, LoomStatus } from "@/lib/api";
import LoomCard from "@/components/LoomCard";
import { RefreshCw, Activity, Zap, Cpu, AlertCircle } from "lucide-react";

export default function LoomsPage() {
  const [looms, setLooms] = useState<LoomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getLooms();
      setLooms(data);
    } catch (err: any) {
      setError(err.message || "Failed to load loom telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLooms();
    // Refresh every 30 seconds for "live" feel
    const interval = setInterval(loadLooms, 30000);
    return () => clearInterval(interval);
  }, [loadLooms]);

  const activeLooms = looms.filter(l => l.status === "Running").length;
  const avgEfficiency = looms.length 
    ? (looms.reduce((acc, curr) => acc + curr.efficiency, 0) / looms.length).toFixed(1) 
    : 0;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-xl)" }}>
        <div>
          <h1 className="text-display-xl">Loom Telemetry</h1>
          <p className="text-body-md" style={{ marginTop: "4px" }}>
            Real-time machine performance and production levels
          </p>
        </div>
        <button className="btn btn-ghost" onClick={loadLooms} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spinning" : ""} />
          Refresh Live Data
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-xl)", marginBottom: "var(--spacing-xl)" }}>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--surface-soft)", padding: "12px", borderRadius: "12px", color: "var(--blue)" }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="text-caption-sm" style={{ color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Active Looms</div>
            <div className="text-display-sm">{loading ? "..." : `${activeLooms} / ${looms.length}`}</div>
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--surface-soft)", padding: "12px", borderRadius: "12px", color: "var(--green)" }}>
            <Zap size={24} />
          </div>
          <div>
            <div className="text-caption-sm" style={{ color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Avg. Busyness</div>
            <div className="text-display-sm">{loading ? "..." : `${avgEfficiency}%`}</div>
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--surface-soft)", padding: "12px", borderRadius: "12px", color: "var(--primary)" }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="text-caption-sm" style={{ color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Factory Health</div>
            <div className="text-display-sm">{loading ? "..." : "Stable"}</div>
          </div>
        </div>
      </div>

      {/* Grid of Looms */}
      {loading && looms.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "1rem" }}>
          <div className="spinner" />
          <span style={{ color: "var(--muted)" }}>Connecting to loom sensors...</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--spacing-xl)" }}>
          {looms.map(loom => (
            <LoomCard key={loom.loom_id} loom={loom} />
          ))}
        </div>
      )}
    </div>
  );
}
