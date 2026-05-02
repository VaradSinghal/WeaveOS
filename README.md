# WeaveOS — AI-Powered Textile Delay Prediction

A non-intrusive, full-stack delay prediction layer over ERP systems (Tally / Excel) for textile factories.

## Architecture

```
weaveos/
├── backend/    FastAPI + XGBoost + SQLite
└── frontend/   Next.js 16 + Tailwind + Recharts
```

## Quick Start

### 1. Backend

```bash
cd backend

# 1. Create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up Supabase
#    a) Create a project at https://supabase.com
#    b) Open SQL Editor and run the contents of schema.sql
#    c) Copy your project URL and service-role key

# 4. Configure environment
copy .env.example .env
#    Fill in SUPABASE_URL and SUPABASE_KEY in .env

# 5. Seed database with sample data & train model
python seed.py

# 6. Start API server
uvicorn app.main:app --reload
```

API will be available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at **http://localhost:3000**

---

## Features

| Feature | Details |
|---------|---------|
| CSV/Excel ingestion | Flexible column aliasing, Tally-compatible |
| OCR | EasyOCR bill/invoice image parsing |
| Feature engineering | % completion, % time elapsed, speed ratio, completion lag |
| ML model | XGBoost (300 estimators, trained on 4,000 synthetic samples) |
| Risk levels | On Track / At Risk / High Risk |
| Dashboard | KPI cards, sortable table, probability bars, risk badges |
| Order detail | Completion gauge, production chart, probability history |

## Risk Thresholds

| Status | Delay Probability |
|--------|-------------------|
| ✅ On Track | < 35% |
| ⚠️ At Risk | 35% – 65% |
| 🔴 High Risk | > 65% |

## API Endpoints

```
GET    /orders                     — All orders with latest prediction
GET    /orders/{id}                — Single order
GET    /orders/{id}/logs           — Production logs
POST   /ingest/orders              — Upload orders CSV/Excel
POST   /ingest/production-logs     — Upload production logs CSV/Excel
POST   /ingest/ocr                 — Upload bill image (EasyOCR)
POST   /predict/{id}               — Predict one order
POST   /predict/all/batch          — Predict all orders
GET    /predict/history/{id}       — Prediction history
```
