import React, { useState, useCallback } from 'react'
import { getCardPrice, formatEur, pctChange, formatPct } from '../lib/api'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function PricesLive({ cartes, userId, onRefresh }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selected, setSelected] = useState(null)

  const runFetch = useCallback(async () => {
    if (!cartes.length) return
    setLoading(true)
    setResults([])
    setProgress(0)

    const done = []
    const seen = new Map()

    for (let i = 0; i < cartes.length; i++) {
      const c = cartes[i]
      const key = `${c.serie}|${c.numero}`
      let price

      if (seen.has(key)) {
        price = seen.get(key)
      } else {
        price = await getCardPrice(c.serie, c.numero, c.cardmarket_id)
        seen.set(key, price)
        await delay(300)
      }

      const trend = price?.trend ?? null
      const pnl = trend != null && c.prix_achat > 0 ? pctChange(trend, c.prix_achat) : null

      done.push({
        ...c,
        cm_trend: trend,
        cm_avg7: price?.avg7 ?? null,
        cm_avg30: price?.avg30 ?? null,
        cm_low: price?.low ?? null,
        cm_source: price?.source ?? null,
        pnl,
      })
      setProgress(Math.round(((i + 1) / cartes.length) * 100))
      setResults([...done])
    }

    // Snapshot du patrimoine total cartes
    const totalValeur = done.reduce((a, c) => a + (c.cm_trend || c.valeur_loose || 0) * (c.quantite || 1), 0)
    await supabase.from('price_history').insert({
      user_id: userId,
      total_valeur: totalValeur,
      recorded_at: new Date().toISOString(),
    })

    setLoading(false)
    onRefresh()
  }, [cartes, userId, onRefresh])

  const sorted = [...results].sort((a, b) => (b.cm_trend || 0) * (b.quantite || 1) - (a.cm_trend || 0) * (a.quantite || 1))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Prix Live CardMarket</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Source : TCGdex + PokeTrace · Mise à jour en temps réel
          </div>
        </div>
        <button className="btn-primary" onClick={runFetch} disabled={loading}>
          {loading ? `⟳ ${progress}%` : '🔄 Actualiser tous les prix'}
        </button>
      </div>

      {/* Barre de progression */}
      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Récupération des prix... {progress}% ({Math.round(progress * cartes.length / 100)}/{cartes.length})</div>
        </div>
      )}

      {/* Détail carte sélectionnée */}
      {selected && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {selected.pokemon || selected.serie} — {selected.numero}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.serie} · {selected.rarete}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
            {[
              ['Trend NM', formatEur(selected.cm_trend)],
              ['Avg 7j', formatEur(selected.cm_avg7)],
              ['Avg 30j', formatEur(selected.cm_avg30)],
              ['Low', formatEur(selected.cm_low)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-bright)' }}>{val}</div>
              </div>
            ))}
          </div>
          {selected.cm_avg7 && selected.cm_avg30 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Évolution prix (simulation basée avg)</div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={[
                  { t: 'Avg 30j', v: selected.cm_avg30 },
                  { t: 'Avg 7j', v: selected.cm_avg7 },
                  { t: 'Trend', v: selected.cm_trend },
                ]}>
                  <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip formatter={v => formatEur(v)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tableau résultats */}
      {sorted.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Pokémon</th>
                  <th>Série</th>
                  <th>Numéro</th>
                  <th style={{ textAlign: 'right' }}>Qté</th>
                  <th style={{ textAlign: 'right' }}>Trend NM</th>
                  <th style={{ textAlign: 'right' }}>Avg 7j</th>
                  <th style={{ textAlign: 'right' }}>Avg 30j</th>
                  <th style={{ textAlign: 'right' }}>Valeur ancienne</th>
                  <th style={{ textAlign: 'right' }}>P&L vs P.A.</th>
                  <th style={{ textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => {
                  const hasPrice = c.cm_trend != null
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.pokemon || '—'}</td>
                      <td><span className="tag" style={{ borderColor: 'rgba(139,92,246,0.3)', color: 'var(--accent-bright)', fontSize: 10 }}>{c.serie}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-bright)', fontWeight: 600 }}>{c.quantite || 1}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: hasPrice ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {hasPrice ? formatEur(c.cm_trend) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{c.cm_avg7 != null ? formatEur(c.cm_avg7) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{c.cm_avg30 != null ? formatEur(c.cm_avg30) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{formatEur(c.valeur_loose || 0)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {c.pnl != null ? (
                          <span className={`badge ${c.pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(c.pnl)}</span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.cm_source ? (
                          <span className="badge badge-neutral" style={{ fontSize: 9 }}>{c.cm_source}</span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!results.length && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 15, marginBottom: 6 }}>Aucun prix chargé</div>
          <div style={{ fontSize: 13 }}>Cliquez sur "Actualiser tous les prix" pour récupérer les données CardMarket</div>
        </div>
      )}
    </div>
  )
}
