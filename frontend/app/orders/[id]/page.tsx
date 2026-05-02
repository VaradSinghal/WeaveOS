"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import CompletionGauge from "@/components/CompletionGauge";
import { api, Order, ProductionLog, Prediction } from "@/lib/api";
import {
  ArrowLeft,
  RefreshCw,
  Package,
  Calendar,
  Cpu,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "0.7rem 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.875rem",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
        {sub && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = decodeURIComponent(params.id as string);

  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, l, h] = await Promise.all([
        api.getOrder(orderId),
        api.getOrderLogs(orderId),
        api.predictionHistory(orderId),
      ]);
      setOrder(o);
      setLogs(l);
      setHistory(h);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const runPredict = async () => {
    setPredicting(true);
    try {
      await api.predictOne(orderId);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  };

  const pred = order?.prediction;

  // Build cumulative production chart data
  const chartData = logs.reduce<{ date: string; daily: number; cumulative: number }[]>(
    (acc, log) => {
      const prev = acc[acc.length - 1]?.cumulative ?? 0;
      acc.push({ date: log.log_date, daily: log.daily_production, cumulative: prev + log.daily_production });
      return acc;
    },
    []
  );

  // Probability history chart
  const probHistory = [...history]
    .reverse()
    .map((p) => ({
      time: p.predicted_at ? new Date(p.predicted_at).toLocaleDateString() : "",
      probability: +(p.delay_probability * 100).toFixed(1),
    }));

  return (
    <>
      {/* Back */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            textDecoration: "none",
            marginBottom: "1.5rem",
            transition: "color 0.15s",
          }}
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem", gap: "1rem" }}>
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)" }}>Loading order…</span>
          </div>
        ) : order ? (
          <div className="fade-in">
            {/* Header */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-xl)" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
                  <h1 className="text-display-xl">{order.product_name}</h1>
                  {pred && <RiskBadge status={pred.risk_status} />}
                </div>
                <p className="text-body-md" style={{ fontFamily: "monospace", marginTop: "4px" }}>
                  {order.order_id}
                </p>
              </div>
              <button className="btn btn-primary" onClick={runPredict} disabled={predicting}>
                {predicting ? <div className="spinner" style={{ width: 15, height: 15 }} /> : <RefreshCw size={15} />}
                {predicting ? "Predicting…" : "Refresh Prediction"}
              </button>
            </div>

            {/* Top row */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
              {/* Gauge */}
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", minWidth: 160 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Completion</div>
                <div style={{ position: "relative", width: 120, height: 120 }}>
                  <CompletionGauge pct={pred?.pct_completion ?? 0} size={120} />
                </div>
              </div>

              {/* Order info */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Package size={13} /> Order Details
                </div>
                <StatRow label="Quantity" value={order.quantity.toLocaleString()} sub="total units" />
                <StatRow label="Start Date" value={order.start_date} />
                <StatRow label="Due Date" value={order.due_date} />
                <StatRow label="Log Entries" value={logs.length} />
              </div>

              {/* Prediction info */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <TrendingUp size={13} /> Prediction Metrics
                </div>
                {pred ? (
                  <>
                    <StatRow label="Delay Probability" value={`${(pred.delay_probability * 100).toFixed(1)}%`} />
                    <StatRow label="Time Elapsed" value={`${pred.pct_time_elapsed.toFixed(1)}%`} />
                    <StatRow label="Actual Speed" value={`${pred.actual_speed.toFixed(1)} u/day`} />
                    <StatRow label="Required Speed" value={`${pred.required_speed.toFixed(1)} u/day`} sub="to finish on time" />
                  </>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
                    No prediction yet. Click "Refresh Prediction".
                  </div>
                )}
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
              {/* Cumulative production */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Cpu size={13} /> Cumulative Production
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                      <Tooltip
                        contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "var(--text-secondary)" }}
                      />
                      <Line type="monotone" dataKey="cumulative" stroke="var(--blue)" strokeWidth={2} dot={false} name="Cumulative" />
                      <Line type="monotone" dataKey="daily" stroke="var(--purple)" strokeWidth={1.5} dot={false} name="Daily" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: "0.85rem" }}>
                    No production logs found.
                  </div>
                )}
              </div>

              {/* Delay probability history */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Clock size={13} /> Delay Probability History
                </div>
                {probHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={probHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} unit="%" />
                      <Tooltip
                        contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [`${v}%`, "Delay Prob"]}
                      />
                      <Line type="monotone" dataKey="probability" stroke="var(--red)" strokeWidth={2} dot={{ r: 3, fill: "var(--red)" }} name="Delay Prob" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: "0.85rem" }}>
                    No prediction history yet.
                  </div>
                )}
              </div>
            </div>

            {/* Raw logs table */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={14} color="var(--blue)" />
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Production Log ({logs.length} entries)</span>
              </div>
              <div style={{ overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Daily Production</th>
                      <th>Machine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={`${log.order_id}-${log.log_date}`}>
                        <td style={{ fontSize: "0.82rem", fontFamily: "monospace" }}>{log.log_date}</td>
                        <td style={{ fontWeight: 500 }}>{log.daily_production.toLocaleString()} units</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{log.machine_assigned ?? "—"}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>No logs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
    </>
  );
}
