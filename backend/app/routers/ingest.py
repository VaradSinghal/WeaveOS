"""
ingest.py — Upload endpoints for CSV/Excel files and OCR bill images.
Uses Supabase PostgREST client for all persistence.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from supabase import Client

from app.db.database import get_db
from app.models.schemas import OCRResult
from app.services import parser as csv_parser
from app.services.ocr import parse_bill_image

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])

ALLOWED_SPREADSHEET = {
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
}
ALLOWED_IMAGE = {
    "image/jpeg", "image/png", "image/webp",
    "image/tiff", "image/bmp", "application/octet-stream",
}


# ── Orders CSV/Excel ──────────────────────────────────────────────────────────

@router.post("/orders", summary="Upload orders CSV or Excel")
async def ingest_orders(
    file: Annotated[UploadFile, File(description="CSV or Excel with order data")],
    db: Client = Depends(get_db),
):
    _validate_mime(file, ALLOWED_SPREADSHEET)
    raw = await file.read()
    try:
        records = csv_parser.parse_orders(raw, file.filename or "upload.csv")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Coerce date objects → ISO strings for Supabase
    rows = [_serialize_dates(r) for r in records]

    try:
        db.table("orders").upsert(rows, on_conflict="order_id").execute()
    except Exception as exc:
        logger.exception("Supabase upsert failed for orders")
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    return {"message": f"Upserted {len(rows)} orders successfully."}


# ── Production Logs CSV/Excel ─────────────────────────────────────────────────

@router.post("/production-logs", summary="Upload production logs CSV or Excel")
async def ingest_production_logs(
    file: Annotated[UploadFile, File(description="CSV or Excel with production log data")],
    db: Client = Depends(get_db),
):
    _validate_mime(file, ALLOWED_SPREADSHEET)
    raw = await file.read()
    try:
        records = csv_parser.parse_production_logs(raw, file.filename or "upload.csv")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    rows = [_serialize_dates(r) for r in records]

    try:
        # Upsert on (order_id, log_date) unique constraint
        db.table("production_logs").upsert(rows, on_conflict="order_id,log_date").execute()
    except Exception as exc:
        logger.exception("Supabase upsert failed for production_logs")
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    return {"message": f"Processed {len(rows)} log rows successfully."}


# ── OCR Bill Image ────────────────────────────────────────────────────────────

@router.post("/ocr", response_model=OCRResult, summary="Upload a bill image for OCR extraction")
async def ingest_ocr(
    file: Annotated[UploadFile, File(description="Bill / invoice image (JPEG, PNG, TIFF, BMP)")],
    save_to_db: bool = False,
    db: Client = Depends(get_db),
):
    _validate_mime(file, ALLOWED_IMAGE)
    raw = await file.read()
    try:
        result = parse_bill_image(raw)
    except Exception as exc:
        logger.exception("OCR failed")
        raise HTTPException(status_code=500, detail=f"OCR processing error: {exc}")

    if save_to_db and result.get("order_id") and result.get("quantity"):
        _upsert_order_from_ocr(result, db)

    return OCRResult(**result)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_mime(file: UploadFile, allowed: set[str]):
    if file.content_type and file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}",
        )


def _serialize_dates(record: dict) -> dict:
    """Convert Python date/datetime objects to ISO strings for Supabase."""
    import datetime
    result = {}
    for k, v in record.items():
        if isinstance(v, (datetime.date, datetime.datetime)):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def _upsert_order_from_ocr(result: dict, db: Client):
    row = {
        "order_id": result["order_id"],
        "product_name": result.get("product_name") or "Unknown",
        "quantity": result["quantity"],
        "start_date": result["start_date"].isoformat() if result.get("start_date") else None,
        "due_date": result["due_date"].isoformat() if result.get("due_date") else None,
    }
    try:
        db.table("orders").upsert(row, on_conflict="order_id").execute()
    except Exception as exc:
        logger.warning("Could not save OCR result to Supabase: %s", exc)
