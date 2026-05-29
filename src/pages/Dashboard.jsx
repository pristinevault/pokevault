import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { formatEur, formatPct, pctChange } from '../lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function StatCard({ label, value, sub, trend }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: trend === 'up' ? 'var(--neon-green)' : trend === 'down' ? 'var(--neon-red)' : 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-bright)' }}>{formatEur(payload[0]?.value)}</div>
    </div>
  )
}

export default function Dashboard({ cartes, scelles, gradees, boosters, priceHistory }) {
  const stats = useMemo(() => {
    const totalPA = [
      ...cartes.map(c => (c.prix_achat || 0) * (c.quantite || 1)),
      ...scelles.map(s => (s.prix_achat || 0) * (s.quantite || 1)),
      ...gradees.map(g => g.prix_achat || 0),
      ...boosters.map(b => b.prix_achat || 0),
    ].reduce((a, b) => a + b, 0)

    const totalValeur = [
      ...cartes.map(c => (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1)),
      ...scelles.map(s => (s.resell || s.retail || s.prix_achat || 0) * (s.quantite || 1)),
      ...gradees.map(g => g.valeur || g.prix_achat || 0),
      ...boosters.map(b => b.valeur_loose || b.prix_achat || 0),
    ].reduce((a, b) => a + b, 0)

    const pnl = totalValeur - totalPA
    const pnlPct = totalPA > 0 ? (pnl / totalPA) * 100 : 0

    const totalItems = cartes.reduce((a, c) => a + (c.quantite || 1), 0)
      + scelles.reduce((a, s) => a + (s.quantite || 1), 0)
      + gradees.length + boosters.length

    return { totalPA, totalValeur, pnl, pnlPct, totalItems }
  }, [cartes, scelles, gradees, boosters])

  // Données pour la courbe historique (depuis price_history + valeur actuelle)
  const chartData = useMemo(() => {
    if (!priceHistory.length) {
      const now = new Date()
      return [
        { date: format(new Date(now.getFullYear(), now.getMonth() - 2, 1), 'MMM', { locale: fr }), valeur: stats.totalPA * 0.92 },
        { date: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'MMM', { locale: fr }), valeur: stats.totalPA * 0.97 },
        { date: "Aujourd'hui", valeur: stats.totalValeur },
      ]
    }
    return priceHistory.slice(-12).map(p => ({
      date: format(new Date(p.recorded_at), 'd MMM', { locale: fr }),
      valeur: p.total_valeur
    }))
  }, [priceHistory, stats])

  // Répartition par catégorie
  const repartition = useMemo(() => {
    const cartesV = cartes.reduce((a, c) => a + (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1), 0)
    const scellesV = scelles.reduce((a, s) => a + (s.resell || s.prix_achat || 0) * (s.quantite || 1), 0)
    const gradeesV = gradees.reduce((a, g) => a + (g.valeur || g.prix_achat || 0), 0)
    const boostersV = boosters.reduce((a, b) => a + (b.valeur_loose || b.prix_achat || 0), 0)
    const total = cartesV + scellesV + gradeesV + boostersV || 1
    return [
      { label: 'Cartes Singles', val: cartesV, pct: (cartesV / total * 100).toFixed(0), color: '#8b5cf6' },
      { label: 'Scellés', val: scellesV, pct: (scellesV / total * 100).toFixed(0), color: '#10b981' },
      { label: 'Gradées', val: gradeesV, pct: (gradeesV / total * 100).toFixed(0), color: '#f59e0b' },
      { label: 'Boosters Art', val: boostersV, pct: (boostersV / total * 100).toFixed(0), color: '#3b82f6' },
    ]
  }, [cartes, scelles, gradees, boosters])

  // Top 5 cartes par valeur
  const top5 = useMemo(() => {
    return [...cartes]
      .sort((a, b) => (b.valeur_loose || 0) * (b.quantite || 1) - (a.valeur_loose || 0) * (a.quantite || 1))
      .slice(0, 5)
  }, [cartes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Patrimoine estimé" value={formatEur(stats.totalValeur)} />
        <StatCard label="Prix d'achat total" value={formatEur(stats.totalPA)} />
        <StatCard
          label="P&L total"
          value={formatEur(stats.pnl)}
          sub={formatPct(stats.pnlPct)}
          trend={stats.pnl >= 0 ? 'up' : 'down'}
        />
        <StatCard label="Nb d'items" value={stats.totalItems} />
      </div>

      {/* Chart + Répartition */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Courbe évolution */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Évolution du patrimoine</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valeur" stroke="#8b5cf6" strokeWidth={2} fill="url(#gv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Répartition</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {repartition.map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{r.pct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatEur(r.val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 cartes */}
      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Top 5 cartes par valeur</div>
        <table>
          <thead>
            <tr>
              <th>Pokémon</th>
              <th>Série</th>
              <th>Rareté</th>
              <th style={{ textAlign: 'right' }}>P.A.</th>
              <th style={{ textAlign: 'right' }}>Valeur</th>
              <th style={{ textAlign: 'right' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((c, i) => {
              const val = (c.valeur_loose || 0) * (c.quantite || 1)
              const pa = (c.prix_achat || 0) * (c.quantite || 1)
              const pnlPct = pctChange(val, pa)
              return (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.pokemon || '—'}</td>
                  <td><span className="tag" style={{ borderColor: 'rgba(139,92,246,0.3)', color: 'var(--accent-bright)' }}>{c.serie}</span></td>
                  <td style={{ fontSize: 12 }}>{c.rarete}</td>
                  <td style={{ textAlign: 'right' }}>{formatEur(pa)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>{formatEur(val)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {pnlPct != null && (
                      <span className={`badge ${pnlPct >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnlPct)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {!top5.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Aucune carte encore ajoutée</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
