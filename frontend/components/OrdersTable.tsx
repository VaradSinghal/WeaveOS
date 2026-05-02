"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Order, OrderAlert } from "@/lib/api";
import RiskBadge from "./RiskBadge";
import RecommendationChip from "./RecommendationChip";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";

type SortKey = "order_id" | "due_date" | "pct_completion" | "delay_probability";
type SortDir = "asc" | "desc";

interface OrdersTableProps {
  orders: Order[];
  alerts?: OrderAlert[];
}

function ProbBar({ prob }: { prob: number }) {
  const color =
    prob < 0.35 ? "var(--green)" : prob < 0.65 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div className="prob-bar-track" style={{ width: 90 }}>
        <div
          className="prob-bar-fill"
          style={{ width: `${prob * 100}%`, background: color }}
        />
      </div>
      <span style={{ fontSize: "0.78rem", color, fontWeight: 600, minWidth: 36 }}>
        {(prob * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function OrdersTable({ orders, alerts = [] }: OrdersTableProps) {
  const alertMap = useMemo(() => {
    const m: Record<string, OrderAlert> = {};
    for (const a of alerts) m[a.order_id] = a;
    return m;
  }, [alerts]);
  const [sortKey, setSortKey] = useState<SortKey>("delay_probability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<string>("all");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ArrowUp size={12} />
      ) : (
        <ArrowDown size={12} />
      )
    ) : (
      <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
    );

  const filtered = useMemo(() => {
    const f = filter === "all" ? orders : orders.filter((o) => o.prediction?.risk_status === filter);
    return [...f].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case "order_id": av = a.order_id; bv = b.order_id; break;
        case "due_date": av = a.due_date; bv = b.due_date; break;
        case "pct_completion": av = a.prediction?.pct_completion ?? -1; bv = b.prediction?.pct_completion ?? -1; break;
        case "delay_probability": av = a.prediction?.delay_probability ?? -1; bv = b.prediction?.delay_probability ?? -1; break;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [orders, filter, sortKey, sortDir]);

  const FILTERS = ["all", "High Risk", "At Risk", "On Track"];

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 99,
              fontSize: "0.78rem",
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid",
              transition: "all 0.15s",
              background: filter === f ? "var(--ink)" : "var(--canvas)",
              color: filter === f ? "var(--canvas)" : "var(--ink)",
              borderColor: filter === f ? "var(--ink)" : "var(--hairline)",
            }}
          >
            {f === "all" ? "All Orders" : f}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text-muted)", alignSelf: "center" }}>
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("order_id")} style={{ width: 130 }}>
                Order ID <SortIcon k="order_id" />
              </th>
              <th>Product</th>
              <th>Qty</th>
              <th onClick={() => handleSort("due_date")}>
                Due Date <SortIcon k="due_date" />
              </th>
              <th onClick={() => handleSort("pct_completion")}>
                Completion <SortIcon k="pct_completion" />
              </th>
              <th>Time Elapsed</th>
              <th>Risk Status</th>
              <th>Recommendations</th>
              <th onClick={() => handleSort("delay_probability")}>
                Delay Prob <SortIcon k="delay_probability" />
              </th>
              <th>Margin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const pred = order.prediction;
              return (
                <tr key={order.order_id} className="fade-in">
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--blue)" }}>
                      {order.order_id}
                    </span>
                  </td>
                  <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order.product_name}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {order.quantity.toLocaleString()}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                    {order.due_date}
                  </td>
                  <td>
                    {pred ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div className="prob-bar-track" style={{ width: 70 }}>
                          <div
                            className="prob-bar-fill"
                            style={{
                              width: `${pred.pct_completion}%`,
                              background: pred.pct_completion >= 75 ? "var(--green)" : pred.pct_completion >= 40 ? "var(--blue)" : "var(--amber)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          {pred.pct_completion.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                    {pred ? `${pred.pct_time_elapsed.toFixed(0)}%` : "—"}
                  </td>
                  <td>
                    {pred ? (
                      <RiskBadge status={pred.risk_status} size="sm" />
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>No prediction</span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const alert = alertMap[order.order_id];
                      if (!alert || !alert.recommendations.length)
                        return <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>;
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: 220 }}>
                          {alert.recommendations.slice(0, 2).map((r) => (
                            <RecommendationChip key={r.code} rec={r} compact />
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {pred ? (
                      <ProbBar prob={pred.delay_probability} />
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>—</span>
                    )}
                  </td>
                  <td>
                    {pred && pred.margin !== undefined && pred.margin !== null ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>
                          ${pred.margin.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 500,
                            color:
                              pred.margin_status === "Healthy"
                                ? "var(--green)"
                                : pred.margin_status === "Margin dropping"
                                ? "var(--amber)"
                                : "var(--primary)",
                          }}
                        >
                          {pred.margin_status}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/orders/${encodeURIComponent(order.order_id)}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        textDecoration: "none",
                        transition: "color 0.15s",
                      }}
                    >
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
