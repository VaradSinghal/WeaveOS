"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, UserCircle } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Dashboard", href: "/" },
    { name: "Uploads", href: "/upload" },
  ];

  return (
    <nav className="top-nav">
      {/* Left: Wordmark */}
      <div style={{ flex: 1 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Dummy logo resembling Airbnb's Bélo shape */}
              <path d="M16 30C16 30 2 21 2 12C2 7.58172 5.58172 4 10 4C12.5029 4 14.7371 5.15049 16 6.94589C17.2629 5.15049 19.4971 4 22 4C26.4183 4 30 7.58172 30 12C30 21 16 30 16 30Z" />
            </svg>
            <span className="text-display-sm" style={{ letterSpacing: "-0.5px" }}>weaveos</span>
          </div>
        </Link>
      </div>

      {/* Center: Tabs */}
      <div style={{ display: "flex", gap: "24px" }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`text-nav-link product-tab ${isActive ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Right: Utilities */}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
        <button className="text-button-sm" style={{ background: "none", border: "none", cursor: "pointer", padding: "12px", borderRadius: "var(--rounded-full)" }}>
          Help Center
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <Globe size={18} color="var(--ink)" />
        </button>
        
        {/* Account pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--rounded-full)",
            padding: "8px 12px",
            cursor: "pointer",
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <Menu size={16} color="var(--ink)" />
          <UserCircle size={28} color="var(--muted)" />
        </div>
      </div>
    </nav>
  );
}
