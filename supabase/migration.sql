-- 0. Buat tabel categories
CREATE TABLE IF NOT EXISTS categories (
  id bigint primary key generated always as identity,
  name text not null
);

-- Tambah kolom category_id ke products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id bigint references categories(id);

-- 1. Tambah kolom ke tabel sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone text;

-- 2. Tambah kolom ke tabel sales_items
ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS note text;

-- 3. Update RPC create_sale_transaction
CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_items json,
  p_payments json,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_sales_id uuid;
  v_invoice_no text;
  v_total numeric := 0;
  v_item json;
BEGIN
  -- Generate sales_id
  v_sales_id := gen_random_uuid();

  -- Calculate total
  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    v_total := v_total + ((v_item->>'price')::numeric * (v_item->>'qty')::numeric);
  END LOOP;

  -- Generate invoice number
  v_invoice_no := 'INV-' || to_char(now(), 'YYMMDD') || '-' || substr(v_sales_id::text, 1, 6);

  -- Insert into sales
  INSERT INTO sales (id, invoice_no, date, total, customer_name, customer_phone, status)
  VALUES (
    v_sales_id,
    v_invoice_no,
    now(),
    v_total,
    p_customer_name,
    p_customer_phone,
    'paid'
  );

  -- Insert into sales_items
  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    INSERT INTO sales_items (sales_id, product_name, qty, price, note)
    VALUES (
      v_sales_id,
      v_item->>'product_name',
      (v_item->>'qty')::numeric,
      (v_item->>'price')::numeric,
      v_item->>'note'
    );
  END LOOP;

  -- Insert into payments
  FOR v_item IN SELECT * FROM json_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sales_id, method, amount, paid_at)
    VALUES (
      v_sales_id,
      v_item->>'method',
      (v_item->>'amount')::numeric,
      now()
    );
  END LOOP;

  RETURN v_invoice_no;
END;
$$ LANGUAGE plpgsql;

-- 4. Update RPC get_receipt
CREATE OR REPLACE FUNCTION get_receipt(p_invoice text)
RETURNS json AS $$
DECLARE
  v_header json;
  v_items json;
  v_payments json;
BEGIN
  -- Get header
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

  -- Get items
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

  -- Get payments
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
