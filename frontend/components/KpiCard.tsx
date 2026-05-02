"use client";

import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color?: string; // no longer heavily used for background
  sub?: string;
}

export default function KpiCard({ label, value, icon, sub }: KpiCardProps) {
  return (
    <div
      className="card fade-in"
      style={{
        padding: "var(--spacing-lg)",
        background: "var(--canvas)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="text-body-sm" style={{ color: "var(--muted)", marginBottom: "var(--spacing-xs)" }}>
            {label}
          </div>
          <div className="text-display-xl" style={{ color: "var(--ink)", lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div className="text-caption-sm" style={{ color: "var(--muted)", marginTop: "var(--spacing-xs)" }}>
              {sub}
            </div>
          )}
        </div>
        <div
          style={{
            color: "var(--ink)",
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
