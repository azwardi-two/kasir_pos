import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { useCart } from '../store/CartContext'
import { ProductCard } from './ProductCard'

export function ProductList() {
  const { products, loading, error } = useProducts()
  const { categories, error: catError } = useCategories()
  const { addItem } = useCart()
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const filtered = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Memuat produk...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>
  }

  return (
    <div>
      {catError && (
        <div className="px-4 pt-2 text-xs text-red-500">Gagal memuat kategori: {catError}</div>
      )}
      {categories.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 auto-rows-max">
        {filtered.map(product => (
          <ProductCard key={product.id} product={product} onAdd={addItem} />
        ))}
      </div>
    </div>
  )
}
