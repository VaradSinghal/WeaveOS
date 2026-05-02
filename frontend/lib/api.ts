const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Order {
  order_id: string;
  product_name: string;
  quantity: number;
  start_date: string;
  due_date: string;
  prediction?: Prediction | null;
}

export interface Prediction {
  order_id: string;
  delay_probability: number;
  risk_status: "On Track" | "At Risk" | "High Risk";
  pct_completion: number;
  pct_time_elapsed: number;
  required_speed: number;
  actual_speed: number;
  predicted_at?: string;
}

export interface ProductionLog {
  order_id: string;
  log_date: string;
  daily_production: number;
  machine_assigned?: string;
}

export interface OCRResult {
  order_id?: string;
  product_name?: string;
  quantity?: number;
  start_date?: string;
  due_date?: string;
  raw_text?: string;
  confidence: number;
}

export interface RecommendationItem {
  code: string;
  text: string;
  priority: "high" | "medium";
}

export interface OrderAlert {
  order_id: string;
  product_name: string;
  risk_status: string;
  delay_probability: number;
  actual_speed: number;
  required_speed: number;
  pct_completion: number;
  pct_time_elapsed: number;
  recommendations: RecommendationItem[];
  alert_message: string;
  generated_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Orders
  getOrders: () => request<Order[]>("/orders"),
  getOrder: (id: string) => request<Order>(`/orders/${id}`),
  getOrderLogs: (id: string) => request<ProductionLog[]>(`/orders/${id}/logs`),
  deleteOrder: (id: string) =>
    request<{ message: string }>(`/orders/${id}`, { method: "DELETE" }),

  // Predictions
  predictOne: (id: string) =>
    request<Prediction>(`/predict/${id}`, { method: "POST" }),
  predictAll: () =>
    request<Prediction[]>("/predict/all/batch", { method: "POST" }),
  predictionHistory: (id: string) =>
    request<Prediction[]>(`/predict/history/${id}`),

  // Ingest — file uploads (no Content-Type header; browser sets multipart boundary)
  uploadOrders: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/ingest/orders`, { method: "POST", body: fd });
    if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
    return res.json() as Promise<{ message: string }>;
  },

  uploadLogs: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/ingest/production-logs`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
    return res.json() as Promise<{ message: string }>;
  },

  uploadOCR: async (file: File, saveToDB = false) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `${API_URL}/ingest/ocr?save_to_db=${saveToDB}`,
      { method: "POST", body: fd }
    );
    if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
    return res.json() as Promise<OCRResult>;
  },

  // Alerts
  getAlerts: () => request<OrderAlert[]>("/alerts"),
  getAlert: (id: string) => request<OrderAlert>(`/alerts/${id}`),
};
