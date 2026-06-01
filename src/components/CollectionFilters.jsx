import React from 'react'

const SERIES_OPTIONS = [
  'Écarlate et Violet', 'Épée et Bouclier', 'Soleil et Lune',
  'XY', 'Noir et Blanc', 'HeartGold SoulSilver', 'Platine',
  'Diamant et Perle', 'EX', 'e-Card', 'Base'
]

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(2024 - i))

export default function CollectionFilters({ mode, filters, onChange }) {
  const set = (k, v) => onChange({ ...filters, [k]: v })

  const commonStyle = { flex: 1, minWidth: 120 }

  return (
    <div className="filters-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        placeholder={mode === 'cartes' ? '🔍 Pokémon, série, numéro...' : mode === 'scelles' ? '🔍 Nom du produit...' : '🔍 Pokémon, série...'}
        value={filters.search || ''}
        onChange={e => set('search', e.target.value)}
        style={{ ...commonStyle, minWidth: 200 }}
      />

      {/* Filtre Bloc / Série */}
      <select value={filters.serie || ''} onChange={e => set('serie', e.target.value)} style={commonStyle}>
        <option value="">Toutes les séries</option>
        {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Filtre Année */}
      <select value={filters.year || ''} onChange={e => set('year', e.target.value)} style={commonStyle}>
        <option value="">Toutes les années</option>
        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Filtre spécifique par mode */}
      {mode === 'cartes' && (
        <select value={filters.rarete || ''} onChange={e => set('rarete', e.target.value)} style={commonStyle}>
          <option value="">Toutes raretés</option>
          {['GOLD', 'ALT', 'AR', 'FULL ART', 'EX', 'VMAX', 'VSTAR', 'TERRACRISTAL', 'RADIEUX', 'HOLO', 'TG'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}

      {mode === 'scelles' && (
        <select value={filters.type || ''} onChange={e => set('type', e.target.value)} style={commonStyle}>
          <option value="">Tous les types</option>
          {['ETB', 'DISPLAY', 'ARSET', 'BOOSTER', 'POKÉBOX', 'UPC', 'COFFRET DÉCOUVERTE', 'VALISETTE'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {mode === 'gradees' && (
        <>
          <select value={filters.gradeur || ''} onChange={e => set('gradeur', e.target.value)} style={commonStyle}>
            <option value="">Tous gradeurs</option>
            {['PSA', 'CGC', 'BGS', 'CCC', 'PCA', 'ACE'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filters.note || ''} onChange={e => set('note', e.target.value)} style={commonStyle}>
            <option value="">Toutes notes</option>
            {['10', '9.5', '9', '8.5', '8', '7.5', '7'].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </>
      )}

      {/* Tri */}
      <select value={filters.sort || 'valeur_desc'} onChange={e => set('sort', e.target.value)} style={commonStyle}>
        <option value="valeur_desc">Valeur ↓</option>
        <option value="valeur_asc">Valeur ↑</option>
        <option value="pnl_desc">P&L ↓</option>
        <option value="recent">Récents</option>
        {mode !== 'gradees' && <option value="alpha">A → Z</option>}
      </select>

      {/* Reset */}
      {Object.values(filters).some(v => v && v !== 'valeur_desc') && (
        <button className="btn-ghost" onClick={() => onChange({ sort: 'valeur_desc' })} style={{ padding: '7px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
          ✕ Reset
        </button>
      )}
    </div>
  )
}
