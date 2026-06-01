import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION', 'BOOSTER']
const TYPE_COLOR = { ETB: '#8b5cf6', DISPLAY: '#10b981', ARSET: '#3b82f6', BOOSTER: '#f59e0b', POKÉBOX: '#ec4899' }

export default function CatalogBrowser({ show, onClose, onSelect }) {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [prixAchat, setPrixAchat] = useState('')
  const [resell, setResell] = useState('')
  const [dateAchat, setDateAchat] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!show) return
    setSelected(null); setSearch(''); setFilterType('')
    setQty(1); setPrixAchat(''); setResell(''); setDateAchat(''); setNotes('')
    if (!catalog.length) {
      setLoading(true)
      supabase.from('sealed_catalog').select('*').eq('actif', true).order('created_at', { ascending: false })
        .then(({ data }) => { setCatalog(data || []); setLoading(false) })
    }
  }, [show])

  const filtered = catalog.filter(c => {
    const matchSearch = !search || (c.nom || '').toLowerCase().includes(search.toLowerCase()) || (c.serie || '').toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || c.type_produit === filterType
    return matchSearch && matchType
  })

  function handleConfirm() {
    if (!selected) return
    onSelect({
      nom: selected.nom,
      type_produit: selected.type_produit,
      serie: selected.serie,
      image_url: selected.image_url || '',
      quantite: parseInt(qty) || 1,
      prix_achat: parseFloat(prixAchat) || 0,
      retail: selected.retail_fr || 0,
      resell: parseFloat(resell) || 0,
      date_achat: dateAchat || null,
      notes,
      catalog_id: selected.id,
    })
    onClose()
  }

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 740, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selected ? '📦 Ajouter à ma collection' : '📦 Catalogue Pristine Vault'}
              </h2>
              {!selected && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{catalog.filter(c=>c.actif).length} produits disponibles</div>}
            </div>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {!selected && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, fontSize: 14, padding: '8px 12px' }}
                autoFocus
              />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 130 }}>
                <option value="">Tous types</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement du catalogue...</div>}

          {/* Catalogue grid */}
          {!loading && !selected && (
            <>
              {filtered.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {filtered.map(item => {
                    const typeColor = TYPE_COLOR[item.type_produit] || 'var(--accent)'
                    return (
                      <div key={item.id} onClick={() => setSelected(item)}
                        style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                        <div style={{ position: 'relative', background: 'var(--bg-card)', minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.nom} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                            : <div style={{ fontSize: 44, opacity: 0.2 }}>📦</div>}
                          <div style={{ position: 'absolute', top: 6, left: 6 }}>
                            <span style={{ background: `${typeColor}22`, border: `1px solid ${typeColor}55`, borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 700, color: typeColor }}>{item.type_produit}</span>
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px 10px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2 }}>{item.nom}</div>
                          {item.serie && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{item.serie}</div>}
                          {item.retail_fr > 0 && <div style={{ fontSize: 11, color: 'var(--neon-green)', fontWeight: 500 }}>Retail : {item.retail_fr} €</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  {catalog.length === 0
                    ? 'Le catalogue est vide pour l\'instant.\nUtilise le bouton "Ajouter manuellement" en attendant.'
                    : `Aucun résultat pour "${search}"`}
                </div>
              )}
            </>
          )}

          {/* Confirmation + prix */}
          {!loading && selected && (
            <div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
                <div style={{ flexShrink: 0, width: 110 }}>
                  {selected.image_url
                    ? <img src={selected.image_url} alt={selected.nom} style={{ width: '100%', borderRadius: 8, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                    : <div style={{ width: 110, height: 140, background: 'var(--bg-card)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.serie}</div>
                  {selected.retail_fr > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--neon-green)', marginBottom: 4 }}>Prix retail : {selected.retail_fr} €</div>
                  )}
                  {selected.release_date && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sortie : {new Date(selected.release_date).toLocaleDateString('fr-FR')}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Quantité', key: 'qty', el: <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%' }} /> },
                  { label: "Prix d'achat (€)", key: 'pa', el: <input type="number" step="0.01" placeholder={selected.retail_fr || '0.00'} value={prixAchat} onChange={e => setPrixAchat(e.target.value)} style={{ width: '100%' }} /> },
                  { label: 'Revente estimée (€)', key: 'rs', el: <input type="number" step="0.01" placeholder="0.00" value={resell} onChange={e => setResell(e.target.value)} style={{ width: '100%' }} /> },
                  { label: "Date d'achat", key: 'da', el: <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} style={{ width: '100%' }} /> },
                  { label: 'Notes', key: 'nt', col: true, el: <input type="text" placeholder="Optionnel" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%' }} /> },
                ].map(f => (
                  <div key={f.key} style={f.col ? { gridColumn: '1/-1' } : {}}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{f.label}</label>
                    {f.el}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ flex: 1 }}>← Retour au catalogue</button>
                <button className="btn-primary" onClick={handleConfirm} style={{ flex: 2 }}>✅ Ajouter à ma collection</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
