import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Product } from '../types'

export interface ProductWithCategory extends Product {
  category_name?: string
}

export function useProducts() {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')
    if (error) {
      setError(error.message)
    } else if (data) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category_id: p.category_id,
        category_name: p.categories?.name || undefined,
      }))
      setProducts(mapped)
    }
    setLoading(false)
  }

  return { products, loading, error, reload: loadProducts }
}
