"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import KpiCard from "@/components/KpiCard";
import OrdersTable from "@/components/OrdersTable";
import { api, Order } from "@/lib/api";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const runPredictions = async () => {
    setPredicting(true);
    setError("");
    try {
      await api.predictAll();
      await loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  };

  // KPI computations
  const total = orders.length;
  const onTrack = orders.filter((o) => o.prediction?.risk_status === "On Track").length;
  const atRisk = orders.filter((o) => o.prediction?.risk_status === "At Risk").length;
  const highRisk = orders.filter((o) => o.prediction?.risk_status === "High Risk").length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div
          className="page-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <div>
            <h1 className="page-title">Order Intelligence Dashboard</h1>
            <p className="page-subtitle">
              AI-powered delay risk prediction across all active factory orders
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={loadOrders} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spinning" : ""} />
              Refresh
            </button>
            <button className="btn btn-primary" onClick={runPredictions} disabled={predicting}>
              {predicting ? <div className="spinner" style={{ width: 15, height: 15 }} /> : <RefreshCw size={15} />}
              {predicting ? "Predicting…" : "Run Predictions"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="kpi-grid">
          <KpiCard
            label="Total Orders"
            value={loading ? "…" : total}
            icon={<Package size={18} />}
            color="blue"
            sub="Active orders in system"
          />
          <KpiCard
            label="On Track"
            value={loading ? "…" : onTrack}
            icon={<CheckCircle2 size={18} />}
            color="green"
            sub={total ? `${((onTrack / total) * 100).toFixed(0)}% of orders` : ""}
          />
          <KpiCard
            label="At Risk"
            value={loading ? "…" : atRisk}
            icon={<AlertTriangle size={18} />}
            color="amber"
            sub="Moderate delay probability"
          />
          <KpiCard
            label="High Risk"
            value={loading ? "…" : highRisk}
            icon={<XOctagon size={18} />}
            color="red"
            sub="Immediate attention needed"
          />
        </div>

        {/* Orders Table */}
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 200,
              gap: "1rem",
            }}
          >
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)" }}>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Package size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No orders yet</div>
            <div style={{ fontSize: "0.85rem" }}>
              Upload orders and production logs from the{" "}
              <a href="/upload" style={{ color: "var(--blue)", textDecoration: "none" }}>
                Upload page
              </a>
              , then run predictions.
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "var(--text-secondary)",
                }}
              >
                All Orders
              </h2>
            </div>
            <OrdersTable orders={orders} />
          </div>
        )}
      </main>
    </div>
  );
}
