import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange, SERIE_MAP } from '../lib/api'
import ItemModal from '../components/ItemModal'
import SeriesBrowser from '../components/SeriesBrowser'
import PriceRefreshButton from '../components/PriceRefreshButton'
import CollectionFilters from '../components/CollectionFilters'

const SERIE_OPTIONS = Object.keys(SERIE_MAP).sort()
const RARETE_OPTIONS = ['GOLD', 'ALT', 'AR', 'FULL ART', 'FULL ART SHINY', 'EX', 'VMAX', 'VSTAR', 'V', 'TERRACRISTAL', 'RADIEUX', 'RAINBOW', 'HOLO', 'SHINY', 'TG', 'POKEBALL', 'ESCOUADE', 'GX', 'AMAZING']

const FIELDS = [
  { key: 'quantite', label: 'Quantité', type: 'number', default: 1, step: 1 },
  { key: 'pokemon', label: 'Pokémon / Nom', type: 'text', placeholder: 'ex: Dracaufeu' },
  { key: 'serie', label: 'Série', type: 'select', options: SERIE_OPTIONS },
  { key: 'rarete', label: 'Rareté', type: 'select', options: RARETE_OPTIONS },
  { key: 'numero', label: 'Numéro', type: 'text', placeholder: 'ex: 253/198' },
  { key: 'prix_achat', label: "Prix d'achat (€)", type: 'number', step: 0.01, default: 0 },
  { key: 'valeur_loose', label: 'Valeur estimée (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'date_achat', label: "Date d'achat", type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Cartes({ cartes, userId, onRefresh }) {
  const [browser, setBrowser] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [deleting, setDeleting] = useState(null)
  const [filters, setFilters] = useState({ sort: 'valeur_desc' })

  const filtered = useMemo(() => {
    let data = [...cartes]
    if (filters.search) data = data.filter(c =>
      (c.pokemon || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (c.serie || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (c.numero || '').includes(filters.search)
    )
    if (filters.rarete) data = data.filter(c => c.rarete === filters.rarete)
    if (filters.serie) data = data.filter(c => (c.serie || '').toLowerCase().includes(filters.serie.toLowerCase()))
    switch (filters.sort) {
      case 'valeur_desc': data.sort((a, b) => (b.valeur_loose||0)*(b.quantite||1) - (a.valeur_loose||0)*(a.quantite||1)); break
      case 'valeur_asc': data.sort((a, b) => (a.valeur_loose||0)*(a.quantite||1) - (b.valeur_loose||0)*(b.quantite||1)); break
      case 'pnl_desc': data.sort((a, b) => pctChange(b.valeur_loose,b.prix_achat) - pctChange(a.valeur_loose,a.prix_achat)); break
      case 'alpha': data.sort((a, b) => (a.pokemon||'').localeCompare(b.pokemon||'')); break
    }
    return data
  }, [cartes, filters])

  const totaux = useMemo(() => ({
    pa: filtered.reduce((a, c) => a + (c.prix_achat||0)*(c.quantite||1), 0),
    val: filtered.reduce((a, c) => a + (c.valeur_loose||0)*(c.quantite||1), 0),
  }), [filtered])

  async function handleBrowserSelect(cardData) {
    await supabase.from('cartes').insert({ ...cardData, user_id: userId })
    onRefresh()
  }
  async function handleSave(form) {
    const payload = { ...form, user_id: userId }
    if (editing) await supabase.from('cartes').update(payload).eq('id', editing.id)
    else await supabase.from('cartes').insert(payload)
    setModal(false); setEditing(null); onRefresh()
  }
  async function handleDelete(id) {
    await supabase.from('cartes').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Cartes Loose</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {filtered.length} cartes · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PriceRefreshButton cartes={cartes} userId={userId} onRefresh={onRefresh} />
          <button className="btn-ghost" onClick={() => { setEditing(null); setModal(true) }} style={{ fontSize: 12 }}>+ Manuel</button>
          <button className="btn-primary" onClick={() => setBrowser(true)}>🔍 Ajouter une carte</button>
        </div>
      </div>

      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <CollectionFilters mode="cartes" filters={filters} onChange={setFilters} />
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {[['grid', '⊞'], ['table', '☰']].map(([m, icon]) => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
              background: viewMode === m ? 'var(--bg-card)' : 'transparent',
              color: viewMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            const pnl = pctChange(c.valeur_loose||0, c.prix_achat||0)
            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  {c.image_url
                    ? <img src={c.image_url} alt={c.pokemon} style={{ width: '100%', aspectRatio: '2.5/3.5', objectFit: 'cover', display: 'block' }} onError={e => e.target.style.display='none'} />
                    : <div style={{ aspectRatio: '2.5/3.5', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.25 }}>🃏</div>}
                  {c.quantite > 1 && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>×{c.quantite}</div>}
                  {c.prix_achat > 0 && pnl != null && <div style={{ position: 'absolute', top: 6, left: 6 }}><span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`} style={{ fontSize: 9 }}>{formatPct(pnl)}</span></div>}
                </div>
                <div style={{ padding: '9px 10px 11px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.pokemon || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{c.rarete} · {c.serie}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-bright)' }}>{formatEur(c.valeur_loose||0)}</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button className="btn-ghost" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => { setEditing(c); setModal(true) }}>✏</button>
                      <button className="btn-danger" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => setDeleting(c.id)}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {!filtered.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>Aucune carte.</div>}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ width: 44 }}>Img</th><th>Qté</th><th>Pokémon</th><th>Série</th><th>Rareté</th><th>N°</th>
                <th style={{ textAlign: 'right' }}>P.A.</th><th style={{ textAlign: 'right' }}>Valeur</th><th style={{ textAlign: 'right' }}>P&L</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(c => {
                  const pnl = pctChange(c.valeur_loose||0, c.prix_achat||0)
                  return (
                    <tr key={c.id}>
                      <td>{c.image_url ? <img src={c.image_url} style={{ width: 32, borderRadius: 3 }} onError={e => e.target.style.display='none'} /> : <div style={{ width: 32, height: 44, background: 'var(--bg-elevated)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: 0.3 }}>🃏</div>}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-bright)' }}>{c.quantite||1}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.pokemon||'—'}</td>
                      <td><span className="tag" style={{ borderColor: 'rgba(139,92,246,0.3)', color: 'var(--accent-bright)', fontSize: 10 }}>{c.serie}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.rarete}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.numero}</td>
                      <td style={{ textAlign: 'right' }}>{formatEur(c.prix_achat||0)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{formatEur(c.valeur_loose||0)}</td>
                      <td style={{ textAlign: 'right' }}>{c.prix_achat > 0 && pnl != null ? <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span> : '—'}</td>
                      <td><div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" style={{ padding: '3px 7px', fontSize: 10 }} onClick={() => { setEditing(c); setModal(true) }}>✏</button>
                        <button className="btn-danger" style={{ padding: '3px 7px', fontSize: 10 }} onClick={() => setDeleting(c.id)}>✕</button>
                      </div></td>
                    </tr>
                  )
                })}
                {!filtered.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune carte.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleting && <div className="modal-overlay"><div className="modal" style={{ maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
        <h3 style={{ marginBottom: 8 }}>Supprimer cette carte ?</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Irréversible.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
          <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
        </div>
      </div></div>}

      <SeriesBrowser show={browser} onClose={() => setBrowser(false)} onSelect={handleBrowserSelect} mode="card" />
      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }} onSave={handleSave} fields={FIELDS} title={editing ? 'Modifier la carte' : 'Ajouter manuellement'} initialData={editing} />
    </div>
  )
}
