import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatEur, formatPct, pctChange } from '../lib/api'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { fr } from 'date-fns/locale'

const TABS_CHART = [
  { id: '24h', label: '24H' },
  { id: '1S', label: '1S' },
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '1A', label: '1A' },
  { id: 'MAX', label: 'MAX' },
]

const CATEGORY_TABS = ['Global', 'Scellés', 'Cartes Loose', 'Gradées']

function TabSwitch({ tabs, active, onChange, small }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated)', borderRadius: 8, padding: 3 }}>
      {tabs.map(t => {
        const id = typeof t === 'string' ? t : t.id
        const label = typeof t === 'string' ? t : t.label
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            flex: 1, padding: small ? '4px 8px' : '5px 8px',
            border: 'none', borderRadius: 6,
            fontSize: small ? 10 : 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            background: active === id ? 'var(--bg-card)' : 'transparent',
            color: active === id ? 'var(--text-primary)' : 'var(--text-muted)',
            whiteSpace: 'nowrap'
          }}>{label}</button>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, sub, trend, hidden }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, filter: hidden ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: hidden ? 'none' : 'auto' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: trend === 'up' ? 'var(--neon-green)' : trend === 'down' ? 'var(--neon-red)' : 'var(--text-muted)', filter: hidden ? 'blur(6px)' : 'none' }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-bright)' }}>{formatEur(payload[0]?.value)}</div>
    </div>
  )
}

function filterByPeriod(history, period) {
  const now = new Date()
  let cutoff
  switch (period) {
    case '24h': cutoff = subDays(now, 1); break
    case '1S': cutoff = subDays(now, 7); break
    case '1M': cutoff = subMonths(now, 1); break
    case '3M': cutoff = subMonths(now, 3); break
    case '1A': cutoff = subYears(now, 1); break
    default: cutoff = null
  }
  if (!cutoff) return history
  return history.filter(p => new Date(p.recorded_at) >= cutoff)
}

function Top5Valeur({ cartes, scelles, gradees, boosters, hidden }) {
  const [tab, setTab] = useState('Global')
  const items = useMemo(() => {
    let pool = []
    if (tab === 'Global' || tab === 'Cartes Loose') pool.push(...cartes.map(c => ({ ...c, _val: (c.valeur_loose || 0) * (c.quantite || 1), _label: c.pokemon || '—', _sub: c.serie, _type: 'carte' })))
    if (tab === 'Global' || tab === 'Scellés') {
      pool.push(...scelles.map(s => ({ ...s, _val: (s.resell || s.retail || s.prix_achat || 0) * (s.quantite || 1), _label: s.nom || '—', _sub: s.type_produit, _type: 'scelle' })))
      pool.push(...boosters.map(b => ({ ...b, _val: b.valeur_loose || b.prix_achat || 0, _label: b.pokemon || '—', _sub: b.serie, _type: 'booster' })))
    }
    if (tab === 'Global' || tab === 'Gradées') pool.push(...gradees.map(g => ({ ...g, _val: g.valeur || g.prix_achat || 0, _label: g.pokemon || '—', _sub: `${g.gradeur} ${g.note}`, _type: 'gradee' })))
    return pool.sort((a, b) => b._val - a._val).slice(0, 5)
  }, [tab, cartes, scelles, gradees, boosters])

  const typeIcon = { carte: '🃏', scelle: '📦', gradee: '🏆', booster: '✨' }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>🏆 Top 5 par valeur</div>
        <TabSwitch tabs={CATEGORY_TABS} active={tab} onChange={setTab} small />
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="top5-cards">
        {items.map((item, i) => (
          <div key={item.id || i} style={{ flexShrink: 0, width: 110, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {item.image_url
              ? <img src={item.image_url} alt={item._label} style={{ width: '100%', aspectRatio: '2.5/3.5', objectFit: 'cover', display: 'block' }} onError={e => e.target.style.display='none'} />
              : <div style={{ aspectRatio: '2.5/3.5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'var(--bg-card)', opacity: 0.4 }}>{typeIcon[item._type]}</div>}
            <div style={{ padding: '7px 8px 9px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._sub}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-bright)', filter: hidden ? 'blur(5px)' : 'none' }}>{formatEur(item._val)}</div>
            </div>
          </div>
        ))}
        {!items.length && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Aucun item.</div>}
      </div>
    </div>
  )
}

function Top5Variations({ cartes, scelles, gradees, hidden }) {
  const [tab, setTab] = useState('Global')
  const items = useMemo(() => {
    let pool = []
    if (tab === 'Global' || tab === 'Cartes Loose') pool.push(...cartes.filter(c => c.prix_achat > 0 && c.valeur_loose > 0).map(c => ({ ...c, _label: c.pokemon || '—', _sub: c.serie, _pnl: pctChange(c.valeur_loose, c.prix_achat), _val: c.valeur_loose })))
    if (tab === 'Global' || tab === 'Scellés') pool.push(...scelles.filter(s => s.prix_achat > 0 && (s.resell || s.retail)).map(s => ({ ...s, _label: s.nom || '—', _sub: s.type_produit, _pnl: pctChange(s.resell || s.retail, s.prix_achat), _val: s.resell || s.retail })))
    if (tab === 'Global' || tab === 'Gradées') pool.push(...gradees.filter(g => g.prix_achat > 0 && g.valeur > 0).map(g => ({ ...g, _label: g.pokemon || '—', _sub: `${g.gradeur} ${g.note}`, _pnl: pctChange(g.valeur, g.prix_achat), _val: g.valeur })))
    return pool.sort((a, b) => Math.abs(b._pnl || 0) - Math.abs(a._pnl || 0)).slice(0, 5)
  }, [tab, cartes, scelles, gradees])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>📊 Top 5 variations P&L</div>
        <TabSwitch tabs={CATEGORY_TABS} active={tab} onChange={setTab} small />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => {
          const up = (item._pnl || 0) >= 0
          return (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item._label} style={{ width: 32, borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                : <div style={{ width: 32, height: 44, background: 'var(--bg-card)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, opacity: 0.4 }}>🃏</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item._sub}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--neon-green)' : 'var(--neon-red)' }}>{formatPct(item._pnl)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', filter: hidden ? 'blur(4px)' : 'none' }}>{formatEur(item._val)}</div>
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
  const [chartPeriod, setChartPeriod] = useState('MAX')
  const [hidden, setHidden] = useState(false)

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
    const totalItems = cartes.reduce((a, c) => a + (c.quantite || 1), 0) + scelles.reduce((a, s) => a + (s.quantite || 1), 0) + gradees.length + boosters.length
    return { totalPA, totalValeur, pnl, pnlPct, totalItems }
  }, [cartes, scelles, gradees, boosters])

  const chartData = useMemo(() => {
    const filtered = filterByPeriod(priceHistory, chartPeriod)
    if (!filtered.length) {
      const now = new Date()
      return [
        { date: format(new Date(now.getFullYear(), now.getMonth() - 2, 1), 'MMM', { locale: fr }), valeur: stats.totalPA * 0.92 },
        { date: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'MMM', { locale: fr }), valeur: stats.totalPA * 0.97 },
        { date: "Auj.", valeur: stats.totalValeur },
      ]
    }
    return filtered.map(p => ({
      date: format(new Date(p.recorded_at), chartPeriod === '24h' ? 'HH:mm' : 'd MMM', { locale: fr }),
      valeur: p.total_valeur
    }))
  }, [priceHistory, chartPeriod, stats])

  const repartition = useMemo(() => {
    const cartesV = cartes.reduce((a, c) => a + (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1), 0)
    const scellesV = [...scelles, ...boosters].reduce((a, s) => a + (s.resell || s.prix_achat || 0) * (s.quantite || 1), 0)
    const gradeesV = gradees.reduce((a, g) => a + (g.valeur || g.prix_achat || 0), 0)
    const total = cartesV + scellesV + gradeesV || 1
    return [
      { label: 'Cartes Loose', val: cartesV, pct: (cartesV / total * 100).toFixed(0), color: '#8b5cf6' },
      { label: 'Scellés', val: scellesV, pct: (scellesV / total * 100).toFixed(0), color: '#10b981' },
      { label: 'Gradées', val: gradeesV, pct: (gradeesV / total * 100).toFixed(0), color: '#f59e0b' },
    ]
  }, [cartes, scelles, gradees, boosters])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="stats-row">
        <StatCard label="Patrimoine estimé" value={formatEur(stats.totalValeur)} hidden={hidden} />
        <StatCard label="Prix d'achat" value={formatEur(stats.totalPA)} hidden={hidden} />
        <StatCard label="P&L total" value={formatEur(stats.pnl)} sub={formatPct(stats.pnlPct)} trend={stats.pnl >= 0 ? 'up' : 'down'} hidden={hidden} />
        <StatCard label="Nb d'items" value={stats.totalItems} />
      </div>

      {/* Chart + Répartition */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }} className="grid-2col">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Évolution du patrimoine</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setHidden(h => !h)} title={hidden ? 'Afficher les montants' : 'Masquer les montants'} style={{
                background: hidden ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${hidden ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '4px 10px', fontSize: 14, cursor: 'pointer',
                color: hidden ? 'var(--accent-bright)' : 'var(--text-muted)'
              }}>{hidden ? '👁' : '👁‍🗨'}</button>
              <TabSwitch tabs={TABS_CHART} active={chartPeriod} onChange={setChartPeriod} small />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valeur" stroke="#8b5cf6" strokeWidth={2} fill="url(#gv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 16 }}>Répartition</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {repartition.map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{r.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, filter: hidden ? 'blur(5px)' : 'none' }}>{formatEur(r.val)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="grid-2col">
        <Top5Valeur cartes={cartes} scelles={scelles} gradees={gradees} boosters={boosters} hidden={hidden} />
        <Top5Variations cartes={cartes} scelles={scelles} gradees={gradees} hidden={hidden} />
      </div>
    </div>
  )
}
