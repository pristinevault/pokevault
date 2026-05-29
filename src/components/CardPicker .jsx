import React, { useState, useEffect, useRef } from 'react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function CardPicker({ show, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [prixAchat, setPrixAchat] = useState('')
  const [dateAchat, setDateAchat] = useState('')
  const [notes, setNotes] = useState('')
  const inputRef = useRef()
  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    if (show) {
      setQuery(''); setResults([]); setSelected(null)
      setQty(1); setPrixAchat(''); setDateAchat(''); setNotes('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [show])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return }
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/cards?name=like:${encodeURIComponent(debouncedQuery)}`)
      .then(r => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then(data => {
        const arr = Array.isArray(data) ? data.slice(0, 30) : []
        setResults(arr)
        setLoading(false)
      })
      .catch(() => { setResults([]); setLoading(false) })
  }, [debouncedQuery])

  function handleSelect(card) {
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id}`)
      .then(r => r.json())
      .then(detail => { setSelected(detail); setLoading(false) })
      .catch(() => { setSelected(card); setLoading(false) })
  }

  function handleConfirm() {
    if (!selected) return
    const setCode = selected.set?.id?.toUpperCase().replace(/-/g, '') || selected.set?.name?.toUpperCase() || ''
    const total = selected.set?.cardCount?.total || '?'
    onSelect({
      pokemon: selected.name,
      serie: setCode,
      rarete: selected.rarity || '',
      numero: selected.localId ? `${selected.localId}/${total}` : '',
      tcgdex_id: selected.id,
      image_url: selected.image ? `${selected.image}/high.webp` : '',
      quantite: qty,
      prix_achat: parseFloat(prixAchat) || 0,
      valeur_loose: selected.pricing?.cardmarket?.trend || 0,
      date_achat: dateAchat || null,
      notes,
    })
    onClose()
  }

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected ? '✅ Carte sélectionnée' : '🔍 Rechercher une carte'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          {!selected && (
            <input
              ref={inputRef}
              placeholder="Tape un nom FR... ex: Dracaufeu, Mewtwo, Évoli"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 15, padding: '10px 14px' }}
            />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {selected ? (
            <div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <div style={{ flexShrink: 0 }}>
                  {selected.image ? (
                    <img src={`${selected.image}/high.webp`} alt={selected.name}
                      style={{ width: 140, borderRadius: 10, border: '2px solid var(--accent)' }}
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div style={{ width: 140, height: 196, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🃏</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {selected.set?.name} · {selected.localId}/{selected.set?.cardCount?.total} · {selected.rarity}
                  </div>
                  {selected.pricing?.cardmarket?.trend && (
                    <div style={{ fontSize: 13, color: 'var(--neon-green)', marginBottom: 12 }}>
                      📈 Prix CardMarket trend : {selected.pricing.cardmarket.trend.toFixed(2)} €
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Quantité</label>
                      <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prix d'achat (€)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={prixAchat} onChange={e => setPrixAchat(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Date d'achat</label>
                      <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Notes</label>
                      <input type="text" placeholder="Optionnel" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ flex: 1 }}>← Changer de carte</button>
                <button className="btn-primary" onClick={handleConfirm} style={{ flex: 2 }}>✅ Ajouter à la collection</button>
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>Recherche en cours...
                </div>
              )}
              {!loading && results.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {results.map(card => (
                    <div key={card.id} onClick={() => handleSelect(card)}
                      style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s', textAlign: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                      {card.image ? (
                        <img src={`${card.image}/low.webp`} alt={card.name} style={{ width: '100%', display: 'block' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'var(--bg-card)' }}>🃏</div>
                      )}
                      <div style={{ padding: '6px 4px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{card.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{card.set?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  Aucune carte trouvée pour "{query}"<br />
                  <span style={{ fontSize: 12 }}>Essaie le nom français : "Dracaufeu", "Évoli", "Mewtwo"</span>
                </div>
              )}
              {!loading && query.length < 2 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🃏</div>
                  <div style={{ fontSize: 14, marginBottom: 6 }}>Toute la base TCGdex FR</div>
                  <div style={{ fontSize: 12 }}>Tape au moins 2 caractères pour rechercher</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
