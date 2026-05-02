"use client";

import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: "blue" | "green" | "amber" | "red";
  sub?: string;
}

const colorMap = {
  blue: {
    bg: "var(--blue-dim)",
    border: "rgba(59,130,246,0.2)",
    text: "var(--blue)",
    iconBg: "rgba(59,130,246,0.15)",
  },
  green: {
    bg: "var(--green-dim)",
    border: "rgba(16,185,129,0.2)",
    text: "var(--green)",
    iconBg: "rgba(16,185,129,0.15)",
  },
  amber: {
    bg: "var(--amber-dim)",
    border: "rgba(245,158,11,0.2)",
    text: "var(--amber)",
    iconBg: "rgba(245,158,11,0.15)",
  },
  red: {
    bg: "var(--red-dim)",
    border: "rgba(239,68,68,0.2)",
    text: "var(--red)",
    iconBg: "rgba(239,68,68,0.15)",
  },
};

export default function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div
      className="card fade-in"
      style={{
        padding: "1.25rem 1.5rem",
        background: c.bg,
        borderColor: c.border,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: c.text,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
              {sub}
            </div>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: c.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.text,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
