-- ============================================================
-- WeaveOS — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Orders
create table if not exists orders (
  order_id      text primary key,
  product_name  text        not null,
  quantity      integer     not null,
  start_date    date        not null,
  due_date      date        not null,
  created_at    timestamptz not null default now()
);

-- 2. Production logs  (unique per order + day to allow upserts)
create table if not exists production_logs (
  id                bigserial primary key,
  order_id          text        not null references orders(order_id) on delete cascade,
  log_date          date        not null,
  daily_production  integer     not null,
  machine_assigned  text,
  created_at        timestamptz not null default now(),
  unique (order_id, log_date)
);

-- 3. Predictions
create table if not exists predictions (
  id                  bigserial primary key,
  order_id            text        not null references orders(order_id) on delete cascade,
  predicted_at        timestamptz not null default now(),
  delay_probability   float8      not null,
  risk_status         text        not null,
  pct_completion      float8,
  pct_time_elapsed    float8,
  required_speed      float8,
  actual_speed        float8
);

-- Indexes for common query patterns
create index if not exists idx_prod_logs_order_id   on production_logs(order_id);
create index if not exists idx_predictions_order_id on predictions(order_id);
create index if not exists idx_predictions_at       on predictions(predicted_at desc);

-- Enable Row Level Security (optional — remove if using service role key only)
-- alter table orders          enable row level security;
-- alter table production_logs enable row level security;
-- alter table predictions     enable row level security;
