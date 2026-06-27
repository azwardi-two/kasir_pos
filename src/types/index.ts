export interface Category {
  id: number
  name: string
}

export interface Product {
  id: number
  name: string
  price: number
  category_id: number | null
}

export interface CartItem {
  productId: number
  name: string
  price: number
  qty: number
  note?: string
}

export interface SaleHeader {
  sales_id: string
  invoice_no: string
  date: string
  total: number
  total_paid: number
  change_amount: number
  customer_name?: string
  customer_phone?: string
}

export interface SaleItem {
  sales_id: string
  product_name: string
  qty: number
  price: number
  subtotal: number
  note?: string
}

export interface SalePayment {
  sales_id: string
  method: string
  amount: number
  paid_at: string
}

export interface Receipt {
  header: SaleHeader
  items: SaleItem[]
  payments: SalePayment[]
}
