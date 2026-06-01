import React, { useState, useEffect, useRef } from 'react'

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const EXCLUDED_SERIES = ['tcgp', 'tcgop', 'tcgl']

function isExcluded(id) {
  if (!id) return false
  const lower = id.toLowerCase()
  return EXCLUDED_SERIES.some(ex => lower.startsWith(ex))
}

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
  const [retail, setRetail] = useState('')
  const [resell, setResell] = useState('')
  const [typeProduit, setTypeProduit] = useState('ETB')
  const [dateAchat, setDateAchat] = useState('')
  const [notes, setNotes] = useState('')
  const inputRef = useRef()
  const debouncedQuery = useDebounce(query, 450)

  useEffect(() => {
    if (!show) return
    setStep('series'); setSelectedSerie(null); setSelectedSet(null)
    setSelected(null); setQuery(''); setSearchResults([])
    setQty(1); setPrixAchat(''); setRetail(''); setResell('')
    setTypeProduit('ETB'); setDateAchat(''); setNotes('')
    if (!series.length) {
      setLoading(true)
      fetch('https://api.tcgdex.net/v2/fr/series')
        .then(r => r.json())
        .then(data => {
          const filtered = (Array.isArray(data) ? data : []).filter(s => !isExcluded(s.id))
          setSeries(filtered.reverse())
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [show])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setSearchResults([]); return }
    setLoading(true)
    const endpoint = mode === 'card'
      ? `https://api.tcgdex.net/v2/fr/cards?name=like:${encodeURIComponent(debouncedQuery)}&set.id=not:tcgp`
      : `https://api.tcgdex.net/v2/fr/sets?name=like:${encodeURIComponent(debouncedQuery)}`
    fetch(endpoint)
      .then(r => r.json())
      .then(data => { setSearchResults(Array.isArray(data) ? data.slice(0, 24) : []); setLoading(false) })
      .catch(() => { setSearchResults([]); setLoading(false) })
  }, [debouncedQuery, mode])

  function selectSerie(serie) {
    setSelectedSerie(serie); setLoading(true); setStep('sets')
    fetch(`https://api.tcgdex.net/v2/fr/series/${serie.id}`)
      .then(r => r.json())
      .then(data => {
        const s = (data.sets || []).filter(set => !isExcluded(set.id))
        setSets(s.reverse())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function selectSet(set) {
    setSelectedSet(set); setLoading(true); setStep('items')
    fetch(`https://api.tcgdex.net/v2/fr/sets/${set.id}`)
      .then(r => r.json())
      .then(data => {
        if (mode === 'card') setCards(data.cards || [])
        else setCards([data])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function selectCard(card) {
    if (mode === 'card') {
      setLoading(true)
      fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id || `${selectedSet.id}-${card.localId}`}`)
        .then(r => r.json())
        .then(detail => { setSelected(detail); setStep('confirm'); setLoading(false) })
        .catch(() => { setSelected(card); setStep('confirm'); setLoading(false) })
    } else {
      setSelected(card); setStep('confirm')
    }
  }

  function handleSearchSelect(item) {
    if (mode === 'card') {
      setLoading(true)
      fetch(`https://api.tcgdex.net/v2/fr/cards/${item.id}`)
        .then(r => r.json())
        .then(d => { setSelected(d); setStep('confirm'); setLoading(false) })
        .catch(() => { setSelected(item); setStep('confirm'); setLoading(false) })
    } else {
      setSelected(item); setStep('confirm')
    }
  }

  function handleConfirm() {
    if (!selected) return
    if (mode === 'card') {
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
    } else {
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
        notes,
      })
    }
    onClose()
  }

  if (!show) return null

  const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION', 'BOOSTER']

  const breadcrumb = [
    { label: 'Séries', step: 'series' },
    selectedSerie && { label: selectedSerie.name, step: 'sets' },
    selectedSet && { label: selectedSet.name, step: 'items' },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {mode === 'card' ? '🃏 Ajouter une carte' : '📦 Ajouter un scellé'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {/* Search bar */}
          {step !== 'confirm' && (
            <input
              ref={inputRef}
              placeholder={mode === 'card' ? 'Recherche rapide par nom... ex: Dracaufeu' : 'Recherche rapide par set...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 14, padding: '9px 13px', marginBottom: 10 }}
            />
          )}

          {/* Breadcrumb */}
          {step !== 'confirm' && step !== 'series' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={b.step}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>›</span>}
                  <button onClick={() => setStep(b.step)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                    fontSize: 12, color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--accent-bright)',
                    fontWeight: i === breadcrumb.length - 1 ? 500 : 400, borderRadius: 4,
                  }}>{b.label}</button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</div>}

          {/* Résultats de recherche */}
          {!loading && query.length >= 2 && searchResults.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Résultats recherche ({searchResults.length})
              </div>
              {mode === 'card' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {searchResults.map(card => (
                    <div key={card.id} onClick={() => handleSearchSelect(card)}
                      style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s', textAlign: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                      {card.image ? <img src={`${card.image}/low.webp`} alt={card.name} style={{ width: '100%' }} onError={e => e.target.style.display = 'none'} /> : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🃏</div>}
                      <div style={{ padding: '4px 4px 6px' }}>
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{card.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{card.set?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {searchResults.map(set => (
                    <div key={set.id} onClick={() => handleSearchSelect(set)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      {set.logo && <img src={`${set.logo}.webp`} alt={set.name} style={{ height: 36, objectFit: 'contain', width: 80 }} onError={e => e.target.style.display = 'none'} />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{set.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{set.releaseDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Séries */}
          {!loading && (query.length < 2) && step === 'series' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Choisir une série</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {series.map(serie => (
                  <div key={serie.id} onClick={() => selectSerie(serie)}
                    style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '14px 12px', transition: 'all 0.15s', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                    {serie.logo
                      ? <img src={`${serie.logo}.webp`} alt={serie.name} style={{ height: 44, objectFit: 'contain', marginBottom: 8 }} onError={e => { e.target.style.display = 'none' }} />
                      : <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>}
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{serie.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Sets */}
          {!loading && query.length < 2 && step === 'sets' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Choisir un set — {selectedSerie?.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {sets.map(set => (
                  <div key={set.id} onClick={() => selectSet(set)}
                    style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '14px 12px', transition: 'all 0.15s', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                    {set.logo
                      ? <img src={`${set.logo}.webp`} alt={set.name} style={{ height: 44, objectFit: 'contain', marginBottom: 8, maxWidth: '100%' }} onError={e => { e.target.style.display = 'none' }} />
                      : <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>}
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{set.name}</div>
                    {set.cardCount?.total && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{set.cardCount.total} cartes</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Cards/Items */}
          {!loading && query.length < 2 && step === 'items' && mode === 'card' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {selectedSet?.name} — {cards.length} cartes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                {cards.map(card => (
                  <div key={card.localId || card.id} onClick={() => selectCard(card)}
                    style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                    {card.image
                      ? <img src={`${card.image}/low.webp`} alt={card.name} style={{ width: '100%', display: 'block' }} onError={e => e.target.style.display = 'none'} />
                      : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🃏</div>}
                    <div style={{ padding: '4px 4px 6px' }}>
                      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{card.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{card.localId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm card */}
          {step === 'confirm' && selected && mode === 'card' && (
            <div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <div style={{ flexShrink: 0 }}>
                  {selected.image
                    ? <img src={`${selected.image}/high.webp`} alt={selected.name} style={{ width: 140, borderRadius: 10, border: '2px solid var(--accent)' }} onError={e => e.target.style.display = 'none'} />
                    : <div style={{ width: 140, height: 196, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🃏</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.set?.name} · {selected.localId}/{selected.set?.cardCount?.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{selected.rarity}</div>
                  {selected.pricing?.cardmarket?.trend && (
                    <div style={{ fontSize: 13, color: 'var(--neon-green)', marginBottom: 14 }}>
                      📈 Trend CardMarket : {selected.pricing.cardmarket.trend.toFixed(2)} €
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Quantité', el: <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} style={{ width: '100%' }} /> },
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

          {/* Confirm sealed */}
          {step === 'confirm' && selected && mode === 'sealed' && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-elevated)', borderRadius: 10, alignItems: 'center' }}>
                {selected.logo
                  ? <img src={`${selected.logo}.webp`} alt={selected.name} style={{ height: 56, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ fontSize: 36 }}>📦</div>}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selected.cardCount?.total} cartes · {selected.releaseDate}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Type de produit', el: <select value={typeProduit} onChange={e => setTypeProduit(e.target.value)} style={{ width: '100%' }}>{TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select> },
                  { label: 'Quantité', el: <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} style={{ width: '100%' }} /> },
                  { label: "Prix d'achat (€)", el: <input type="number" step="0.01" placeholder="0.00" value={prixAchat} onChange={e => setPrixAchat(e.target.value)} style={{ width: '100%' }} /> },
                  { label: 'Prix retail (€)', el: <input type="number" step="0.01" placeholder="0.00" value={retail} onChange={e => setRetail(e.target.value)} style={{ width: '100%' }} /> },
                  { label: 'Revente estimée (€)', el: <input type="number" step="0.01" placeholder="0.00" value={resell} onChange={e => setResell(e.target.value)} style={{ width: '100%' }} /> },
                  { label: "Date d'achat", el: <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} style={{ width: '100%' }} /> },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{f.label}</label>
                    {f.el}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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
