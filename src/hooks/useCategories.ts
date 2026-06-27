import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data as Category[])
    setLoading(false)
  }

  return { categories, loading, reload: load }
}
