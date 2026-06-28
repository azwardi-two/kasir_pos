import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.from('categories').select('*').order('name')
    if (err) {
      setError(err.message)
    } else if (data) {
      setCategories(data as Category[])
    }
    setLoading(false)
  }

  return { categories, loading, error, reload: load }
}
