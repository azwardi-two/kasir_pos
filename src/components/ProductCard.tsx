import type { Product } from '../types'

interface Props {
  product: Product
  onAdd: (product: Product) => void
}

export function ProductCard({ product, onAdd }: Props) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:shadow-md hover:border-blue-300 transition cursor-pointer active:scale-95 flex flex-col items-center justify-center min-h-[90px]"
    >
      <span className="text-sm font-medium text-gray-800 leading-tight">{product.name}</span>
      <span className="text-blue-600 font-bold mt-1">
        Rp {product.price.toLocaleString('id-ID')}
      </span>
    </button>
  )
}
