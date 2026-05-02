"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import { OCRResult } from "@/lib/api";
import { FileSpreadsheet, ImageIcon, FileText, Info } from "lucide-react";

type Tab = "orders" | "logs" | "ocr";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "orders", label: "Orders CSV/Excel", icon: FileSpreadsheet },
  { id: "logs", label: "Production Logs", icon: FileText },
  { id: "ocr", label: "Bill Image (OCR)", icon: ImageIcon },
];

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  return (
    <>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h1 className="text-display-xl">Upload Data</h1>
        <p className="text-body-md" style={{ marginTop: "4px" }}>
          Import orders and production logs from Tally exports, Excel sheets, or scanned invoices
        </p>
      </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.3rem",
            background: "var(--bg-surface)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            marginBottom: "1.75rem",
            width: "fit-content",
          }}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setOcrResult(null); setSuccessMsg(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1.1rem",
                borderRadius: 9,
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s",
                background: tab === id ? "var(--blue)" : "transparent",
                color: tab === id ? "white" : "var(--text-secondary)",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Upload zone */}
          <div>
            <UploadZone
              type={tab}
              onSuccess={(msg) => setSuccessMsg(msg)}
              onOCRResult={(r) => setOcrResult(r)}
            />
          </div>

          {/* Instructions / OCR result panel */}
          <div>
            {tab === "ocr" && ocrResult ? (
              <div className="card fade-in" style={{ padding: "1.5rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ImageIcon size={16} color="var(--blue)" />
                  OCR Extracted Fields
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Confidence: {(ocrResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {[
                  { label: "Order ID", value: ocrResult.order_id },
                  { label: "Product Name", value: ocrResult.product_name },
                  { label: "Quantity", value: ocrResult.quantity?.toLocaleString() },
                  { label: "Start Date", value: ocrResult.start_date },
                  { label: "Due Date", value: ocrResult.due_date },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.6rem 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)", fontWeight: value ? 500 : 400 }}>
                      {value ?? "Not detected"}
                    </span>
                  </div>
                ))}
                {ocrResult.raw_text && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Raw OCR Text
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        background: "var(--bg-elevated)",
                        padding: "0.75rem",
                        borderRadius: 8,
                        maxHeight: 120,
                        overflowY: "auto",
                        lineHeight: 1.6,
                        fontFamily: "monospace",
                      }}
                    >
                      {ocrResult.raw_text}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Info size={15} color="var(--blue)" />
                  {tab === "orders" ? "Orders File Format" : tab === "logs" ? "Production Logs Format" : "Bill Image Tips"}
                </div>
                {tab === "orders" && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    <p style={{ marginBottom: "0.75rem" }}>Required columns:</p>
                    <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                      <tbody>
                        {[
                          ["order_id", "Unique order identifier"],
                          ["product_name", "Fabric / product name"],
                          ["quantity", "Total units to produce"],
                          ["start_date", "Order start date"],
                          ["due_date", "Delivery deadline"],
                        ].map(([col, desc]) => (
                          <tr key={col}>
                            <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", color: "var(--blue)", fontFamily: "monospace", fontWeight: 500, whiteSpace: "nowrap" }}>{col}</td>
                            <td style={{ color: "var(--text-muted)" }}>{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Date format: YYYY-MM-DD or DD/MM/YYYY
                    </p>
                  </div>
                )}
                {tab === "logs" && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    <p style={{ marginBottom: "0.75rem" }}>Required columns:</p>
                    <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                      <tbody>
                        {[
                          ["order_id", "Matches order in orders table"],
                          ["log_date", "Date of production entry"],
                          ["daily_production", "Units produced that day"],
                          ["machine_assigned", "Loom / machine ID (optional)"],
                        ].map(([col, desc]) => (
                          <tr key={col}>
                            <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", color: "var(--blue)", fontFamily: "monospace", fontWeight: 500, whiteSpace: "nowrap" }}>{col}</td>
                            <td style={{ color: "var(--text-muted)" }}>{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tab === "ocr" && (
                  <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 2, paddingLeft: "1.2rem" }}>
                    <li>Use clear, high-contrast scans (300 DPI+)</li>
                    <li>Ensure field labels like "Order No", "Qty", "Due Date" are visible</li>
                    <li>Supported: JPEG, PNG, WebP, TIFF</li>
                    <li>EasyOCR uses pattern matching — review results before saving</li>
                    <li>Enable "Save to DB" to auto-create the order from extracted data</li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
    </>
  );
}
