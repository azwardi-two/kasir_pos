import { useCart } from '../store/CartContext'
import { CartItemRow } from './CartItem'

interface Props {
  onCheckout: () => void
  customerName: string
  customerPhone: string
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
}

export function Cart({ onCheckout, customerName, customerPhone, onCustomerNameChange, onCustomerPhoneChange }: Props) {
  const { items, total, updateQty, updateNote, removeItem } = useCart()

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-800">Pesanan</h2>
        <p className="text-xs text-gray-500">{items.length} item</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Belum ada item
          </div>
        ) : (
          items.map(item => (
            <CartItemRow
              key={item.productId}
              item={item}
              onUpdateQty={updateQty}
              onUpdateNote={updateNote}
              onRemove={removeItem}
            />
          ))
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
        <input
          type="text"
          value={customerName}
          onChange={e => onCustomerNameChange(e.target.value)}
          placeholder="Nama Pemesan"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          value={customerPhone}
          onChange={e => onCustomerPhoneChange(e.target.value)}
          placeholder="No. Telp (opsional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex justify-between items-center text-lg font-bold text-gray-800">
          <span>Total</span>
          <span>Rp {total.toLocaleString('id-ID')}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || !customerName.trim()}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Bayar
        </button>
      </div>
    </div>
  )
}
