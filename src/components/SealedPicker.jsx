import React, { useState, useEffect, useRef } from 'react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION']

export default function SealedPicker({ show, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [prixAchat, setPrixAchat] = useState('')
  const [retail, setRetail] = useState('')
  const [resell, setResell] = useState('')
  const [typeProduit, setTypeProduit] = useState('')
  const [dateAchat, setDateAchat] = useState('')
  const inputRef = useRef()
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (show) {
      setQuery(''); setResults([]); setSelected(null)
      setQty(1); setPrixAchat(''); setRetail(''); setResell('')
      setTypeProduit(''); setDateAchat('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [show])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return }
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/sets?name=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setResults(Array.isArray(data) ? data.slice(0, 20) : []); setLoading(false) })
      .catch(() => { setResults([]); setLoading(false) })
  }, [debouncedQuery])

  function handleSelect(set) {
    setSelected(set)
    const name = set.name?.toUpperCase() || ''
    if (name.includes('ÉCARLATE') || name.includes('VIOLET') || name.includes('EV')) setTypeProduit('ETB')
    else if (name.includes('DISPLAY') || name.includes('BOOSTER')) setTypeProduit('DISPLAY')
    else setTypeProduit('ETB')
  }

  function handleConfirm() {
    if (!selected) return
    onSelect({
      nom: selected.name,
      type_produit: typeProduit,
      quantite: qty,
      prix_achat: parseFloat(prixAchat) || 0,
      retail: parseFloat(retail) || 0,
      resell: parseFloat(resell) || 0,
      date_achat: dateAchat || null,
      tcgdex_set_id: selected.id,
      image_url: selected.logo || '',
    })
    onClose()
  }

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, width: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected ? '✅ Produit sélectionné' : '📦 Rechercher un produit scellé'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          {!selected && (
            <input
              ref={inputRef}
              placeholder="Tape le nom d'un set... ex: Écarlate et Violet, Mascarade, Paldéa"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 15, padding: '10px 14px' }}
            />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {selected ? (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                {selected.logo ? (
                  <img src={`${selected.logo}.webp`} alt={selected.name}
                    style={{ height: 60, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'} />
                ) : <div style={{ fontSize: 40 }}>📦</div>}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selected.cardCount?.total} cartes · {selected.releaseDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Type de produit</label>
                  <select value={typeProduit} onChange={e => setTypeProduit(e.target.value)} style={{ width: '100%' }}>
                    <option value="">— Choisir —</option>
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Quantité</label>
                  <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prix d'achat (€)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={prixAchat} onChange={e => setPrixAchat(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prix retail (€)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={retail} onChange={e => setRetail(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Revente estimée (€)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={resell} onChange={e => setResell(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Date d'achat</label>
                  <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ flex: 1 }}>← Changer</button>
                <button className="btn-primary" onClick={handleConfirm} style={{ flex: 2 }}>✅ Ajouter à la collection</button>
              </div>
            </div>
          ) : (
            <>
              {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Recherche...</div>}
              {!loading && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.map(set => (
                    <div key={set.id} onClick={() => handleSelect(set)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                      {set.logo ? (
                        <img src={`${set.logo}.webp`} alt={set.name} style={{ height: 40, objectFit: 'contain', width: 80 }}
                          onError={e => e.target.style.display = 'none'} />
                      ) : <div style={{ width: 80, textAlign: 'center', fontSize: 24 }}>📦</div>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{set.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{set.cardCount?.total} cartes · {set.releaseDate}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--accent-bright)' }}>Sélectionner →</div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                  Aucun set trouvé pour "{query}"
                </div>
              )}
              {!loading && query.length < 2 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  <div style={{ fontSize: 14, marginBottom: 6 }}>Recherche dans tous les sets Pokémon</div>
                  <div style={{ fontSize: 12 }}>Tape le nom du set ou de l'extension</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
