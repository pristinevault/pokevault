import React, { useState, useEffect, useRef } from 'react'

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const EXCLUDED = ['tcgp', 'tcgop', 'tcgl']
function isExcluded(id) { return id && EXCLUDED.some(ex => id.toLowerCase().startsWith(ex)) }

export default function SeriesBrowser({ show, onClose, onSelect, mode = 'card' }) {
  const [series, setSeries] = useState([])
  const [sets, setSets] = useState([])
  const [cards, setCards] = useState([])
  const [selectedSerie, setSelectedSerie] = useState(null)
  const [selectedSet, setSelectedSet] = useState(null)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('series')
  const [qty, setQty] = useState(1)
  const [prixAchat, setPrixAchat] = useState('')
  const [dateAchat, setDateAchat] = useState('')
  const [notes, setNotes] = useState('')
  const debouncedQuery = useDebounce(query, 450)

  useEffect(() => {
    if (!show) return
    setStep('series'); setSelectedSerie(null); setSelectedSet(null)
    setSelected(null); setQuery(''); setSearchResults([])
    setQty(1); setPrixAchat(''); setDateAchat(''); setNotes('')
    if (!series.length) {
      setLoading(true)
      fetch('https://api.tcgdex.net/v2/fr/series')
        .then(r => r.json())
        .then(data => { setSeries((Array.isArray(data) ? data : []).filter(s => !isExcluded(s.id)).reverse()); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [show])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setSearchResults([]); return }
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/cards?name=like:${encodeURIComponent(debouncedQuery)}&set.id=not:tcgp`)
      .then(r => r.json())
      .then(data => { setSearchResults(Array.isArray(data) ? data.slice(0, 24) : []); setLoading(false) })
      .catch(() => { setSearchResults([]); setLoading(false) })
  }, [debouncedQuery])

  function selectSerie(serie) {
    setSelectedSerie(serie); setLoading(true); setStep('sets')
    fetch(`https://api.tcgdex.net/v2/fr/series/${serie.id}`)
      .then(r => r.json())
      .then(data => { setSets((data.sets || []).filter(s => !isExcluded(s.id)).reverse()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function selectSet(set) {
    setSelectedSet(set); setLoading(true); setStep('items')
    fetch(`https://api.tcgdex.net/v2/fr/sets/${set.id}`)
      .then(r => r.json())
      .then(data => { setCards(data.cards || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function selectCard(card) {
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id || `${selectedSet?.id}-${card.localId}`}`)
      .then(r => r.json())
      .then(detail => { setSelected(detail); setStep('confirm'); setLoading(false) })
      .catch(() => { setSelected(card); setStep('confirm'); setLoading(false) })
  }

  function handleConfirm() {
    if (!selected) return
    const setCode = selected.set?.id?.toUpperCase().replace(/-/g, '') || ''
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

  const breadcrumb = [
    { label: 'Séries', step: 'series' },
    selectedSerie && { label: selectedSerie.name, step: 'sets' },
    selectedSet && { label: selectedSet.name, step: 'items' },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>🃏 Ajouter une carte</h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          {step !== 'confirm' && (
            <input placeholder="Recherche rapide par nom... ex: Dracaufeu" value={query} onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 14, padding: '8px 12px', marginBottom: step !== 'series' ? 10 : 0 }} autoFocus />
          )}
          {step !== 'confirm' && step !== 'series' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={b.step}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>›</span>}
                  <button onClick={() => setStep(b.step)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 12, color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--accent-bright)', fontWeight: i === breadcrumb.length - 1 ? 500 : 400, borderRadius: 4 }}>{b.label}</button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</div>}

          {/* Résultats recherche */}
          {!loading && query.length >= 2 && searchResults.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
              {searchResults.map(card => (
                <div key={card.id} onClick={() => { setQuery(''); selectCard(card) }}
                  style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                  {card.image ? <img src={`${card.image}/low.webp`} alt={card.name} style={{ width: '100%', display: 'block' }} onError={e => e.target.style.display='none'} /> : <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: 0.3 }}>🃏</div>}
                  <div style={{ padding: '4px 5px 6px' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{card.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{card.set?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Séries */}
          {!loading && query.length < 2 && step === 'series' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {series.map(serie => (
                <div key={serie.id} onClick={() => selectSerie(serie)}
                  style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '12px 10px', transition: 'all 0.15s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                  {serie.logo
                    ? <img src={`${serie.logo}.webp`} alt={serie.name}
                        style={{ height: 40, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ fontSize: 24 }}>📦</div>}
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{serie.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sets */}
          {!loading && query.length < 2 && step === 'sets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {sets.map(set => (
                <div key={set.id} onClick={() => selectSet(set)}
                  style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '12px 10px', transition: 'all 0.15s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                  {set.logo
                    ? <img src={`${set.logo}.webp`} alt={set.name}
                        style={{ height: 40, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ fontSize: 24 }}>📦</div>}
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{set.name}</div>
                  {set.cardCount?.total && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{set.cardCount.total} cartes</div>}
                </div>
              ))}
            </div>
          )}

          {/* Cartes du set */}
          {!loading && query.length < 2 && step === 'items' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
              {cards.map(card => (
                <div key={card.localId || card.id} onClick={() => selectCard(card)}
                  style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                  {card.image ? <img src={`${card.image}/low.webp`} alt={card.name} style={{ width: '100%', display: 'block' }} onError={e => e.target.style.display='none'} /> : <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: 0.3 }}>🃏</div>}
                  <div style={{ padding: '4px 5px 6px' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{card.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{card.localId}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && selected && (
            <div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                  {selected.image
                    ? <img src={`${selected.image}/high.webp`} alt={selected.name} style={{ width: 130, borderRadius: 10, border: '2px solid var(--accent)' }} onError={e => e.target.style.display='none'} />
                    : <div style={{ width: 130, height: 182, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.3 }}>🃏</div>}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.set?.name} · {selected.localId}/{selected.set?.cardCount?.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{selected.rarity}</div>
                  {selected.pricing?.cardmarket?.trend && <div style={{ fontSize: 13, color: 'var(--neon-green)', marginBottom: 14 }}>📈 Trend : {selected.pricing.cardmarket.trend.toFixed(2)} €</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Quantité', el: <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value)||1)} style={{ width: '100%' }} /> },
                      { label: "Prix d'achat (€)", el: <input type="number" step="0.01" placeholder="0.00" value={prixAchat} onChange={e => setPrixAchat(e.target.value)} style={{ width: '100%' }} /> },
                      { label: "Date d'achat", el: <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} style={{ width: '100%' }} /> },
                      { label: 'Notes', el: <input type="text" placeholder="Optionnel" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%' }} /> },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{f.label}</label>
                        {f.el}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep('items')} style={{ flex: 1 }}>← Retour</button>
                <button className="btn-primary" onClick={handleConfirm} style={{ flex: 2 }}>✅ Ajouter à la collection</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
