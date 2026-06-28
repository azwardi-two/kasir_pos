-- ============================================================
-- Complete Migration: Tables + RLS + RPC Functions
-- Jalankan di Supabase SQL Editor (sekali saja)
-- ============================================================

-- 1. TABEL DASAR
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id bigint primary key generated always as identity,
  name text not null
);

CREATE TABLE IF NOT EXISTS products (
  id bigint primary key generated always as identity,
  name text not null,
  price numeric not null,
  category_id bigint references categories(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  date timestamptz not null default now(),
  total numeric not null default 0,
  customer_name text,
  customer_phone text,
  status text not null default 'paid'
);

CREATE TABLE IF NOT EXISTS sales_items (
  id bigint primary key generated always as identity,
  sales_id uuid not null references sales(id),
  product_name text not null,
  qty numeric not null,
  price numeric not null,
  subtotal numeric generated always as (qty * price) stored,
  note text
);

CREATE TABLE IF NOT EXISTS payments (
  id bigint primary key generated always as identity,
  sales_id uuid not null references sales(id),
  method text not null,
  amount numeric not null,
  paid_at timestamptz not null default now()
);

-- 2. INDEX
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_items_sales ON sales_items(sales_id);
CREATE INDEX IF NOT EXISTS idx_payments_sales ON payments(sales_id);

-- 3. ROW LEVEL SECURITY
-- ------------------------------------------------------------

-- Categories: anon hanya bisa baca
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select_anon ON categories;
CREATE POLICY categories_select_anon ON categories
  FOR SELECT TO anon USING (true);

-- Products: anon hanya bisa baca
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_select_anon ON products;
CREATE POLICY products_select_anon ON products
  FOR SELECT TO anon USING (true);

-- Sales: anon tidak bisa akses langsung (hanya via RPC SECURITY DEFINER)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_no_access_anon ON sales;
CREATE POLICY sales_no_access_anon ON sales
  FOR ALL TO anon USING (false);

-- Sales_items: anon tidak bisa akses langsung
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_items_no_access_anon ON sales_items;
CREATE POLICY sales_items_no_access_anon ON sales_items
  FOR ALL TO anon USING (false);

-- Payments: anon tidak bisa akses langsung
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_no_access_anon ON payments;
CREATE POLICY payments_no_access_anon ON payments
  FOR ALL TO anon USING (false);

-- 4. RPC FUNCTIONS (SECURITY DEFINER — bypass RLS)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_items json,
  p_payments json,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales_id uuid;
  v_invoice_no text;
  v_total numeric := 0;
  v_item json;
BEGIN
  v_sales_id := gen_random_uuid();

  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    v_total := v_total + ((v_item->>'price')::numeric * (v_item->>'qty')::numeric);
  END LOOP;

  v_invoice_no := 'INV-' || to_char(now(), 'YYMMDD') || '-' || substr(v_sales_id::text, 1, 6);

  INSERT INTO sales (id, invoice_no, date, total, customer_name, customer_phone, status)
  VALUES (v_sales_id, v_invoice_no, now(), v_total, p_customer_name, p_customer_phone, 'paid');

  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    INSERT INTO sales_items (sales_id, product_name, qty, price, note)
    VALUES (v_sales_id, v_item->>'product_name', (v_item->>'qty')::numeric, (v_item->>'price')::numeric, v_item->>'note');
  END LOOP;

  FOR v_item IN SELECT * FROM json_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sales_id, method, amount, paid_at)
    VALUES (v_sales_id, v_item->>'method', (v_item->>'amount')::numeric, now());
  END LOOP;

  RETURN v_invoice_no;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_receipt(p_invoice text)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_header json;
  v_items json;
  v_payments json;
BEGIN
  SELECT json_build_object(
    'sales_id', s.id,
    'invoice_no', s.invoice_no,
    'date', s.date,
    'total', s.total,
    'total_paid', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sales_id = s.id),
    'change_amount', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sales_id = s.id) - s.total,
    'customer_name', s.customer_name,
    'customer_phone', s.customer_phone
  ) INTO v_header
  FROM sales s
  WHERE s.invoice_no = p_invoice;

  SELECT json_agg(json_build_object(
    'sales_id', si.sales_id,
    'product_name', si.product_name,
    'qty', si.qty,
    'price', si.price,
    'subtotal', si.subtotal,
    'note', si.note
  )) INTO v_items
  FROM sales_items si
  WHERE si.sales_id = (SELECT id FROM sales WHERE invoice_no = p_invoice);

  SELECT json_agg(json_build_object(
    'sales_id', p.sales_id,
    'method', p.method,
    'amount', p.amount,
    'paid_at', p.paid_at
  )) INTO v_payments
  FROM payments p
  WHERE p.sales_id = (SELECT id FROM sales WHERE invoice_no = p_invoice);

  RETURN json_build_object(
    'header', v_header,
    'items', COALESCE(v_items, '[]'::json),
    'payments', COALESCE(v_payments, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql;
