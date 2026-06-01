import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatEur, formatPct, pctChange } from '../lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TABS = ['Global', 'Scellés', 'Cartes Loose', 'Gradées']

function TabSwitch({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          flex: 1, padding: '5px 8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          background: active === t ? 'var(--bg-card)' : 'transparent',
          color: active === t ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>{t}</button>
      ))}
    </div>
  )
}

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

function Top5Valeur({ cartes, scelles, gradees, boosters }) {
  const [tab, setTab] = useState('Global')

  const items = useMemo(() => {
    let pool = []
    if (tab === 'Global' || tab === 'Cartes Loose') {
      pool.push(...cartes.map(c => ({ ...c, _type: 'carte', _val: (c.valeur_loose || 0) * (c.quantite || 1), _label: c.pokemon || '—', _sub: c.serie })))
    }
    if (tab === 'Global' || tab === 'Scellés') {
      pool.push(...scelles.map(s => ({ ...s, _type: 'scelle', _val: (s.resell || s.retail || s.prix_achat || 0) * (s.quantite || 1), _label: s.nom || '—', _sub: s.type_produit })))
      pool.push(...boosters.map(b => ({ ...b, _type: 'booster', _val: b.valeur_loose || b.prix_achat || 0, _label: b.pokemon || '—', _sub: b.serie })))
    }
    if (tab === 'Global' || tab === 'Gradées') {
      pool.push(...gradees.map(g => ({ ...g, _type: 'gradee', _val: g.valeur || g.prix_achat || 0, _label: g.pokemon || '—', _sub: `${g.gradeur} ${g.note}` })))
    }
    return pool.sort((a, b) => b._val - a._val).slice(0, 5)
  }, [tab, cartes, scelles, gradees, boosters])

  const typeColor = { carte: '#8b5cf6', scelle: '#10b981', gradee: '#f59e0b', booster: '#3b82f6' }

  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>🏆 Top 5 par valeur</div>
      <TabSwitch tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {items.map((item, i) => (
          <div key={item.id || i} style={{ flexShrink: 0, width: 120, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {item.image_url
              ? <img src={item.image_url} alt={item._label} style={{ width: '100%', display: 'block', aspectRatio: '2.5/3.5', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              : <div style={{ aspectRatio: '2.5/3.5', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {item._type === 'scelle' ? '📦' : item._type === 'gradee' ? '🏆' : '🃏'}
                </div>}
            <div style={{ padding: '8px 8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2 }}>{item._label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{item._sub}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-bright)' }}>{formatEur(item._val)}</div>
              <div style={{ width: '100%', height: 2, background: typeColor[item._type] || 'var(--accent)', borderRadius: 1, marginTop: 4, opacity: 0.6 }} />
            </div>
          </div>
        ))}
        {!items.length && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Aucun item.</div>}
      </div>
    </div>
  )
}

function Top5Variations({ cartes, scelles, gradees }) {
  const [tab, setTab] = useState('Global')

  const items = useMemo(() => {
    let pool = []
    if (tab === 'Global' || tab === 'Cartes Loose') {
      pool.push(...cartes.filter(c => c.prix_achat > 0 && c.valeur_loose > 0).map(c => ({
        ...c, _label: c.pokemon || '—', _sub: c.serie,
        _pnl: pctChange(c.valeur_loose, c.prix_achat),
        _val: c.valeur_loose,
      })))
    }
    if (tab === 'Global' || tab === 'Scellés') {
      pool.push(...scelles.filter(s => s.prix_achat > 0 && (s.resell || s.retail)).map(s => ({
        ...s, _label: s.nom || '—', _sub: s.type_produit,
        _pnl: pctChange(s.resell || s.retail, s.prix_achat),
        _val: s.resell || s.retail,
      })))
    }
    if (tab === 'Global' || tab === 'Gradées') {
      pool.push(...gradees.filter(g => g.prix_achat > 0 && g.valeur > 0).map(g => ({
        ...g, _label: g.pokemon || '—', _sub: `${g.gradeur} ${g.note}`,
        _pnl: pctChange(g.valeur, g.prix_achat),
        _val: g.valeur,
      })))
    }
    return pool.sort((a, b) => Math.abs(b._pnl || 0) - Math.abs(a._pnl || 0)).slice(0, 5)
  }, [tab, cartes, scelles, gradees])

  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>📊 Top 5 variations P&L</div>
      <TabSwitch tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => {
          const up = (item._pnl || 0) >= 0
          return (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item._label} style={{ width: 36, borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: 36, height: 50, background: 'var(--bg-card)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🃏</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item._sub}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: up ? 'var(--neon-green)' : 'var(--neon-red)' }}>{formatPct(item._pnl)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatEur(item._val)}</div>
              </div>
            </div>
          )
        })}
        {!items.length && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>Renseigne des prix d'achat pour voir les variations.</div>}
      </div>
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

  const repartition = useMemo(() => {
    const cartesV = cartes.reduce((a, c) => a + (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1), 0)
    const scellesV = scelles.reduce((a, s) => a + (s.resell || s.prix_achat || 0) * (s.quantite || 1), 0)
    const gradeesV = gradees.reduce((a, g) => a + (g.valeur || g.prix_achat || 0), 0)
    const boostersV = boosters.reduce((a, b) => a + (b.valeur_loose || b.prix_achat || 0), 0)
    const total = cartesV + scellesV + gradeesV + boostersV || 1
    return [
      { label: 'Cartes Loose', val: cartesV, pct: (cartesV / total * 100).toFixed(0), color: '#8b5cf6' },
      { label: 'Scellés', val: scellesV, pct: (scellesV / total * 100).toFixed(0), color: '#10b981' },
      { label: 'Gradées', val: gradeesV, pct: (gradeesV / total * 100).toFixed(0), color: '#f59e0b' },
      { label: 'Boosters Art', val: boostersV, pct: (boostersV / total * 100).toFixed(0), color: '#3b82f6' },
    ]
  }, [cartes, scelles, gradees, boosters])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Patrimoine estimé" value={formatEur(stats.totalValeur)} />
        <StatCard label="Prix d'achat total" value={formatEur(stats.totalPA)} />
        <StatCard label="P&L total" value={formatEur(stats.pnl)} sub={formatPct(stats.pnlPct)} trend={stats.pnl >= 0 ? 'up' : 'down'} />
        <StatCard label="Nb d'items" value={stats.totalItems} />
      </div>

      {/* Chart + Répartition */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Évolution du patrimoine</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valeur" stroke="#8b5cf6" strokeWidth={2} fill="url(#gv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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

      {/* Top 5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Top5Valeur cartes={cartes} scelles={scelles} gradees={gradees} boosters={boosters} />
        <Top5Variations cartes={cartes} scelles={scelles} gradees={gradees} />
      </div>
    </div>
  )
}
