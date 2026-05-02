"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image as ImageIcon, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { api, OCRResult } from "@/lib/api";

type UploadType = "orders" | "logs" | "ocr";

interface UploadZoneProps {
  type: UploadType;
  onSuccess?: (msg: string) => void;
  onOCRResult?: (result: OCRResult) => void;
}

const config: Record<UploadType, {
  label: string;
  accept: Record<string, string[]>;
  icon: typeof FileText;
  hint: string;
}> = {
  orders: {
    label: "Orders CSV / Excel",
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    icon: FileText,
    hint: "Columns: order_id, product_name, quantity, start_date, due_date",
  },
  logs: {
    label: "Production Logs CSV / Excel",
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    icon: FileText,
    hint: "Columns: order_id, log_date, daily_production, machine_assigned",
  },
  ocr: {
    label: "Bill / Invoice Image",
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "image/tiff": [".tiff", ".tif"] },
    icon: ImageIcon,
    hint: "Supports JPEG, PNG, WebP, TIFF — EasyOCR will extract order fields",
  },
};

export default function UploadZone({ type, onSuccess, onOCRResult }: UploadZoneProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { label, accept, icon: Icon, hint } = config[type];

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    const file = accepted[0];
    setStatus("loading");
    setMessage("");
    try {
      if (type === "orders") {
        const res = await api.uploadOrders(file);
        setMessage(res.message);
        onSuccess?.(res.message);
      } else if (type === "logs") {
        const res = await api.uploadLogs(file);
        setMessage(res.message);
        onSuccess?.(res.message);
      } else {
        const res = await api.uploadOCR(file, false);
        setMessage(`OCR complete — confidence: ${(res.confidence * 100).toFixed(1)}%`);
        onOCRResult?.(res);
      }
      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setMessage(msg);
      setStatus("error");
    }
  }, [type, onSuccess, onOCRResult]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""} ${isDragReject ? "reject" : ""}`}
      >
        <input {...getInputProps()} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          {status === "loading" ? (
            <div className="spinner" />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--blue-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={22} color="var(--blue)" />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {isDragActive ? "Drop file here…" : status === "loading" ? "Processing…" : `Upload ${label}`}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {hint}
            </div>
          </div>
          {status === "idle" && (
            <button className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
              <Upload size={14} /> Browse files
            </button>
          )}
        </div>
      </div>

      {status === "success" && (
        <div className="alert alert-success fade-in">
          <CheckCircle size={15} />
          {message}
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-error fade-in">
          <AlertCircle size={15} />
          {message}
        </div>
      )}
    </div>
  );
}
