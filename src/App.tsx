import { useState } from 'react'
import { CartProvider } from './store/CartContext'
import { Layout } from './components/Layout'
import { ProductList } from './components/ProductList'
import { Cart } from './components/Cart'
import { PaymentModal } from './components/PaymentModal'
import { ReceiptPreview } from './components/ReceiptPreview'
import { useCart } from './store/CartContext'
import { useReceipt } from './hooks/useReceipt'

function CashierPage() {
  const [showPayment, setShowPayment] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const { items, total, clearCart } = useCart()
  const { receipt, loading, error, pay, reset } = useReceipt()

  async function handlePay(amountPaid: number) {
    await pay(items, amountPaid, customerName, customerPhone)
  }

  function handleCloseReceipt() {
    reset()
    clearCart()
    setCustomerName('')
    setCustomerPhone('')
  }

  return (
    <>
      <Layout
        left={
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <h1 className="text-xl font-bold text-gray-800">Kasir</h1>
            </div>
            <ProductList />
          </div>
        }
        right={
          <>
            {error && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <Cart
              onCheckout={() => setShowPayment(true)}
              customerName={customerName}
              customerPhone={customerPhone}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
            />
          </>
        }
      />

      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handlePay}
          onCancel={() => setShowPayment(false)}
          loading={loading}
        />
      )}

      {receipt && (
        <ReceiptPreview
          receipt={receipt}
          onClose={handleCloseReceipt}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <CartProvider>
      <CashierPage />
    </CartProvider>
  )
}
