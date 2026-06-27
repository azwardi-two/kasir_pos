import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Product, CartItem } from '../types'

type CartAction =
  | { type: 'ADD'; product: Product }
  | { type: 'REMOVE'; productId: number }
  | { type: 'UPDATE_QTY'; productId: number; qty: number }
  | { type: 'UPDATE_NOTE'; productId: number; note: string }
  | { type: 'CLEAR' }

interface CartState {
  items: CartItem[]
}

interface CartContextValue {
  items: CartItem[]
  total: number
  addItem: (product: Product) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, qty: number) => void
  updateNote: (productId: number, note: string) => void
  clearCart: () => void
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => i.productId === action.product.id)
      if (existing) {
        return {
          items: state.items.map(i =>
            i.productId === action.product.id ? { ...i, qty: i.qty + 1 } : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          { productId: action.product.id, name: action.product.name, price: action.product.price, qty: 1 },
        ],
      }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.productId !== action.productId) }
    case 'UPDATE_QTY':
      return {
        items: state.items.map(i =>
          i.productId === action.productId ? { ...i, qty: Math.max(1, action.qty) } : i
        ),
      }
    case 'UPDATE_NOTE':
      return {
        items: state.items.map(i =>
          i.productId === action.productId ? { ...i, note: action.note } : i
        ),
      }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)

  const addItem = (product: Product) => dispatch({ type: 'ADD', product })
  const removeItem = (productId: number) => dispatch({ type: 'REMOVE', productId })
  const updateQty = (productId: number, qty: number) => dispatch({ type: 'UPDATE_QTY', productId, qty })
  const updateNote = (productId: number, note: string) => dispatch({ type: 'UPDATE_NOTE', productId, note })
  const clearCart = () => dispatch({ type: 'CLEAR' })

  return (
    <CartContext.Provider value={{ items: state.items, total, addItem, removeItem, updateQty, updateNote, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
