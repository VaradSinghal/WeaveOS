"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Activity,
  Settings,
  Factory,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Data", icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Factory size={20} color="white" />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              WeaveOS
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Delay Prediction
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: "1rem 0", flex: 1 }}>
        <div
          style={{
            padding: "0 1.5rem 0.5rem",
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Navigation
        </div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${pathname === href ? "active" : ""}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border)",
          fontSize: "0.7rem",
          color: "var(--text-muted)",
        }}
      >
        <Activity size={12} style={{ display: "inline", marginRight: 4 }} />
        AI-Powered · XGBoost v2
      </div>
    </aside>
  );
}
