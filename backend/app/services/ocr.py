"""
ocr.py — Extract order fields from bill/invoice images using EasyOCR.
"""
from __future__ import annotations

import io
import logging
import re
from datetime import date, datetime
from typing import Optional

from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

_reader = None  # lazy-loaded


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        logger.info("Initialising EasyOCR (first load downloads ~500 MB of models)…")
        _reader = easyocr.Reader(["en"], gpu=False)
        logger.info("EasyOCR ready.")
    return _reader


# ── Public API ────────────────────────────────────────────────────────────────

def parse_bill_image(image_bytes: bytes) -> dict:
    """
    Parse a bill / invoice image and return extracted fields.
    Returns:
        {
            order_id, product_name, quantity,
            start_date, due_date,
            raw_text, confidence
        }
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(img)

    reader = _get_reader()
    results = reader.readtext(img_array, detail=1)  # [(bbox, text, conf), ...]

    texts = [r[1] for r in results]
    confs = [r[2] for r in results]
    full_text = " ".join(texts)
    avg_conf = float(sum(confs) / len(confs)) if confs else 0.0

    logger.debug("OCR raw text: %s", full_text)

    return {
        "order_id": _extract_order_id(full_text),
        "product_name": _extract_product_name(full_text),
        "quantity": _extract_quantity(full_text),
        "start_date": _extract_date(full_text, r"order\s*date|start\s*date|date"),
        "due_date": _extract_date(full_text, r"due\s*date|delivery\s*date|deliver\s*by|deadline"),
        "raw_text": full_text,
        "confidence": round(avg_conf, 4),
    }


# ── Extractors ────────────────────────────────────────────────────────────────

def _extract_order_id(text: str) -> Optional[str]:
    patterns = [
        r"(?:Order|PO|Purchase\s*Order|Invoice|Ref|Bill)[#\s:\-]*([A-Z0-9][\w\-]{2,15})",
        r"\b([A-Z]{2,4}[-/]\d{3,8})\b",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _extract_product_name(text: str) -> Optional[str]:
    patterns = [
        r"(?:Product|Item|Fabric|Material|Description)[:\s]+([A-Za-z][A-Za-z0-9\s]{2,60})",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _extract_quantity(text: str) -> Optional[int]:
    patterns = [
        r"(?:Qty|Quantity|Units?|Pieces?|Meters?|Mtrs?)[:\s]*(\d[\d,]*)",
        r"(\d[\d,]+)\s*(?:units?|pcs?|pieces?|meters?|mtrs?)\b",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1).replace(",", ""))
            except ValueError:
                pass
    return None


_DATE_RE = r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})"


def _extract_date(text: str, label_pattern: str) -> Optional[date]:
    labelled = re.search(
        rf"(?:{label_pattern})[:\s]*{_DATE_RE}",
        text,
        re.IGNORECASE,
    )
    if labelled:
        return _parse_date_str(labelled.group(1))
    # fallback: first date found in text
    raw = re.search(_DATE_RE, text)
    if raw:
        return _parse_date_str(raw.group(1))
    return None


def _parse_date_str(s: str) -> Optional[date]:
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            pass
    return None
