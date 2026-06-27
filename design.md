Saya sedang membuat aplikasi POS dengan React dan Supabase.

Database:
- products(id, name, price)
- sales
- sales_items
- payments

Function:
- create_sale_transaction(p_items json, p_payments json)
- get_receipt(p_invoice text)

Tolong buatkan:
1. UI kasir (produk di kiri, cart di kanan)
2. Klik produk masuk cart
3. Tombol bayar → panggil RPC create_sale_transaction
4. Setelah bayar → ambil get_receipt
5. Print struk sederhana

Gunakan supabase-js.

Untuk MVP:

React UI (VS Code)
   ↓
Supabase JS Client
   ↓
PostgreSQL (tables + RPC function)
   ↓
Print (client side: browser / bluetooth)

DB logic tetap di Supabase (sudah benar)
React hanya:
ambil data produk
kirim transaksi (RPC)
ambil struk
print


supabase URL = https://sujglbmxnfvkobqanwib.supabase.co

AnonKey = sb_publishable_oacE9pXKtvG74wR5NNjvUw_tm-LHqTv 


