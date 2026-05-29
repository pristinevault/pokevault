import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export function useCollection(userId) {
  const [cartes, setCartes] = useState([])
  const [scelles, setScelles] = useState([])
  const [gradees, setGradees] = useState([])
  const [boosters, setBoosters] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [c, s, g, b, ph] = await Promise.all([
      supabase.from('cartes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('scelles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('gradees').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('boosters').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('price_history').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }),
    ])
    setCartes(c.data || [])
    setScelles(s.data || [])
    setGradees(g.data || [])
    setBoosters(b.data || [])
    setPriceHistory(ph.data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { cartes, scelles, gradees, boosters, priceHistory, loading, refresh: fetchAll }
}
