"""
parser.py — Parse uploaded CSV / Excel files into structured dicts.
Handles both Tally-style exports and generic spreadsheets.
"""
import io
from datetime import date
from typing import Optional
import pandas as pd


def _coerce_date(val) -> Optional[date]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, date):
        return val
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y"):
        try:
            import datetime as dt
            return dt.datetime.strptime(str(val).strip(), fmt).date()
        except Exception:
            pass
    return None


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case and strip column names, collapse spaces to underscores."""
    df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
    return df


def parse_orders(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Expected columns (case-insensitive, flexible):
        order_id | quantity | start_date | due_date | product_name (optional)
    Returns list of dicts ready to upsert.
    """
    df = _read_file(file_bytes, filename)
    df = _normalize_columns(df)

    # Alias mapping for common Tally / Excel column names
    aliases = {
        "order_id": ["order_id", "order id", "order_no", "po_no", "po no", "ref"],
        "product_name": ["product_name", "product", "item", "description", "fabric", "material"],
        "quantity": ["quantity", "qty", "units", "total_units"],
        "start_date": ["start_date", "start date", "order_date", "date"],
        "due_date": ["due_date", "due date", "delivery_date", "deadline"],
    }
    df = _apply_aliases(df, aliases)

    required = ["order_id", "quantity", "start_date", "due_date"]
    _check_required(df, required)

    records = []
    for _, row in df.iterrows():
        records.append({
            "order_id": str(row["order_id"]).strip(),
            "product_name": str(row.get("product_name", "Unknown")).strip(),
            "quantity": int(row["quantity"]),
            "start_date": _coerce_date(row["start_date"]),
            "due_date": _coerce_date(row["due_date"]),
        })
    return records


def parse_production_logs(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Expected columns:
        order_id | log_date | daily_production | machine_assigned (optional)
    """
    df = _read_file(file_bytes, filename)
    df = _normalize_columns(df)

    aliases = {
        "order_id": ["order_id", "order id", "order_no", "po_no"],
        "log_date": ["log_date", "log date", "date", "production_date"],
        "daily_production": ["daily_production", "daily production", "produced", "units_produced", "qty_produced"],
        "machine_assigned": ["machine_assigned", "machine", "loom", "loom_id"],
    }
    df = _apply_aliases(df, aliases)
    _check_required(df, ["order_id", "log_date", "daily_production"])

    records = []
    for _, row in df.iterrows():
        records.append({
            "order_id": str(row["order_id"]).strip(),
            "log_date": _coerce_date(row["log_date"]),
            "daily_production": int(row["daily_production"]),
            "machine_assigned": str(row.get("machine_assigned", "")).strip() or None,
        })
    return records


# ── Helpers ──────────────────────────────────────────────────────────────────

def _read_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes))
    raise ValueError(f"Unsupported file type: {filename}")


def _apply_aliases(df: pd.DataFrame, aliases: dict) -> pd.DataFrame:
    for target, candidates in aliases.items():
        if target not in df.columns:
            for c in candidates:
                if c in df.columns:
                    df = df.rename(columns={c: target})
                    break
    return df


def _check_required(df: pd.DataFrame, required: list[str]):
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}. Found: {list(df.columns)}")
