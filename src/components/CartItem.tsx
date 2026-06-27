import { useState } from 'react'
import type { CartItem as CartItemType } from '../types'

interface Props {
  item: CartItemType
  onUpdateQty: (productId: number, qty: number) => void
  onUpdateNote: (productId: number, note: string) => void
  onRemove: (productId: number) => void
}

export function CartItemRow({ item, onUpdateQty, onUpdateNote, onRemove }: Props) {
  const [showNote, setShowNote] = useState(!!item.note)

  return (
    <div className="flex flex-col py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
          <p className="text-xs text-gray-500">Rp {item.price.toLocaleString('id-ID')}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowNote(!showNote); if (showNote) onUpdateNote(item.productId, '') }}
            className={`w-7 h-7 rounded text-sm cursor-pointer ${item.note ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-600`}
            title="Catatan item"
          >
            &#128221;
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQty(item.productId, item.qty - 1)}
            className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold cursor-pointer"
          >
            -
          </button>
          <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
          <button
            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
            className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold cursor-pointer"
          >
            +
          </button>
        </div>
        <p className="w-20 text-right text-sm font-semibold text-gray-800">
          Rp {(item.price * item.qty).toLocaleString('id-ID')}
        </p>
        <button
          onClick={() => onRemove(item.productId)}
          className="text-red-400 hover:text-red-600 text-lg leading-none cursor-pointer ml-1"
        >
          &times;
        </button>
      </div>
      {showNote && (
        <input
          type="text"
          value={item.note || ''}
          onChange={e => onUpdateNote(item.productId, e.target.value)}
          placeholder="Catatan item..."
          className="mt-1 ml-2 text-xs border border-gray-200 rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )}
    </div>
  )
}
