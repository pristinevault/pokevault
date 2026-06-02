import React, { useState } from 'react'
import { getCardPrice, formatEur } from '../lib/api'
import { supabase } from '../lib/supabase'

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function PriceRefreshButton({ cartes, userId, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(null)

  async function handleRefresh() {
    if (!cartes?.length) return
    setLoading(true); setProgress(0); setDone(null)
    const seen = new Map()
    let updated = 0

    for (let i = 0; i < cartes.length; i++) {
      const c = cartes[i]
      const key = `${c.serie}|${c.numero}`
      let price = seen.get(key)
      if (!price) {
        price = await getCardPrice(c.serie, c.numero, c.cardmarket_id)
        seen.set(key, price)
        await delay(300)
      }
      // Utilise avg7 en priorité, sinon avg30, sinon trend
      const val = price?.avg7 ?? price?.avg30 ?? price?.trend ?? null
      if (val) {
        await supabase.from('cartes').update({ valeur_loose: val }).eq('id', c.id)
        updated++
      }
      setProgress(Math.round(((i + 1) / cartes.length) * 100))
    }

    // Snapshot historique
    const total = cartes.reduce((a, c) => a + (c.valeur_loose || 0) * (c.quantite || 1), 0)
    await supabase.from('price_history').insert({ user_id: userId, total_valeur: total, recorded_at: new Date().toISOString() })

    setLoading(false); setDone(updated); onRefresh()
    setTimeout(() => setDone(null), 4000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 100, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{progress}%</span>
        </div>
      )}
      {done !== null && !loading && (
        <span style={{ fontSize: 12, color: 'var(--neon-green)', whiteSpace: 'nowrap' }}>✅ {done} mis à jour</span>
      )}
      <button className="btn-ghost" onClick={handleRefresh} disabled={loading} style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        <span>{loading ? '⟳' : '🔄'}</span>
        <span className="desktop-nav">{loading ? 'Actualisation...' : 'Actualiser prix'}</span>
      </button>
    </div>
  )
}
