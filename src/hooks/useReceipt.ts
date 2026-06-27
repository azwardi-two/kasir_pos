import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CartItem, Receipt } from '../types'

interface PayResult {
  receipt: Receipt | null
  loading: boolean
  error: string | null
}

export function useReceipt() {
  const [result, setResult] = useState<PayResult>({ receipt: null, loading: false, error: null })

  async function pay(items: CartItem[], amountPaid: number, customerName?: string, customerPhone?: string) {
    setResult({ receipt: null, loading: true, error: null })

    const p_items = items.map(i => ({
      product_name: i.name,
      qty: i.qty,
      price: i.price,
      note: i.note || null,
    }))

    const p_payments = [{ method: 'cash', amount: amountPaid }]

    const { data: invoiceNo, error: payError } = await supabase
      .rpc('create_sale_transaction', { p_items, p_payments, p_customer_name: customerName || null, p_customer_phone: customerPhone || null })

    if (payError) {
      setResult({ receipt: null, loading: false, error: payError.message })
      return
    }

    const { data: receipt, error: receiptError } = await supabase
      .rpc('get_receipt', { p_invoice: invoiceNo })

    if (receiptError) {
      setResult({ receipt: null, loading: false, error: receiptError.message })
      return
    }

    setResult({ receipt: receipt as Receipt, loading: false, error: null })
  }

  function reset() {
    setResult({ receipt: null, loading: false, error: null })
  }

  return { ...result, pay, reset }
}
