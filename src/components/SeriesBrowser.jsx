import React, { useState, useEffect, useRef } from 'react'

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const EXCLUDED = ['tcgp', 'tcgop', 'tcgl']
function isExcluded(id) { return id && EXCLUDED.some(ex => id.toLowerCase().startsWith(ex)) }

// Raretés avec couleurs et labels
const RARETES = [
  { id: 'AR',           label: 'AR',             color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'SAR',          label: 'SAR',             color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'Special Illustration Rare', label: 'SIR', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'Full Art',     label: 'Full Art',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { id: 'Secret Rare',  label: 'Secret',          color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  { id: 'Hyper Rare',   label: 'Hyper',           color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  { id: 'Gold',         label: 'Gold',            color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' },
  { id: 'Illustration Rare', label: 'IR',         color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { id: 'Rare',         label: 'Rare',            color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { id: 'Double Rare',  label: 'Double Rare',     color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { id: 'Ultra Rare',   label: 'Ultra Rare',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { id: 'Radiant Rare', label: 'Radiant',         color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  { id: 'Amazing Rare', label: 'Amazing',         color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  { id: 'VMAX',         label: 'VMAX',            color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'VSTAR',        label: 'VSTAR',           color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'V',            label: 'V',               color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'ex',           label: 'ex',              color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'GX',           label: 'GX',              color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'Trainer Gallery', label: 'TG',           color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  { id: 'Common',       label: 'Commun',          color: '#475569', bg: 'rgba(71,85,105,0.15)' },
  { id: 'Uncommon',     label: 'Peu commun',      color: '#475569', bg: 'rgba(71,85,105,0.15)' },
]

export default function SeriesBrowser({ show, onClose, onSelect, mode = 'card', confirmMode = 'standard' }) {
  const [series, setSeries] = useState([])
  const [sets, setSets] = useState([])
  const [allCards, setAllCards] = useState([])
  const [filteredCards, setFilteredCards] = useState([])
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
  const [activeRarete, setActiveRarete] = useState(null)
  const debouncedQuery = useDebounce(query, 450)

  useEffect(() => {
    if (!show) return
    setStep('series'); setSelectedSerie(null); setSelectedSet(null)
    setSelected(null); setQuery(''); setSearchResults([])
    setQty(1); setPrixAchat(''); setDateAchat(''); setNotes('')
    setActiveRarete(null); setAllCards([]); setFilteredCards([])
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
      .then(data => { setSearchResults(Array.isArray(data) ? data.slice(0, 30) : []); setLoading(false) })
      .catch(() => { setSearchResults([]); setLoading(false) })
  }, [debouncedQuery])

  // Filtrer les cartes par rareté
  useEffect(() => {
    if (!allCards.length) { setFilteredCards([]); return }
    if (!activeRarete) { setFilteredCards(allCards); return }
    const filtered = allCards.filter(c => {
      const r = (c.rarity || '').toLowerCase()
      return r.includes(activeRarete.toLowerCase()) || activeRarete.toLowerCase().includes(r)
    })
    setFilteredCards(filtered)
  }, [allCards, activeRarete])

  function selectSerie(serie) {
    setSelectedSerie(serie); setLoading(true); setStep('sets')
    fetch(`https://api.tcgdex.net/v2/fr/series/${serie.id}`)
      .then(r => r.json())
      .then(data => { setSets((data.sets || []).filter(s => !isExcluded(s.id)).reverse()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function selectSet(set) {
    setSelectedSet(set); setLoading(true); setStep('items'); setActiveRarete(null)
    fetch(`https://api.tcgdex.net/v2/fr/sets/${set.id}`)
      .then(r => r.json())
      .then(data => { setAllCards(data.cards || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function selectCard(card) {
    setLoading(true)
    fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id || `${selectedSet?.id}-${card.localId}`}`)
      .then(r => r.json())
      .then(detail => { setSelected(detail); setStep('confirm'); setLoading(false) })
      .catch(() => { setSelected(card); setStep('confirm'); setLoading(false) })
  }

  function handleSearchSelect(card) {
    setLoading(true); setQuery('')
    fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id}`)
      .then(r => r.json())
      .then(detail => { setSelected(detail); setStep('confirm'); setLoading(false) })
      .catch(() => { setSelected(card); setStep('confirm'); setLoading(false) })
  }

  function handleConfirm() {
    if (!selected) return
    const setCode = selected.set?.id?.toUpperCase().replace(/-/g, '') || ''
    const total = selected.set?.cardCount?.total || '?'
    const cardData = {
      pokemon: selected.name,
      serie: setCode,
      rarete: selected.rarity || '',
      numero: selected.localId ? `${selected.localId}/${total}` : '',
      tcgdex_id: selected.id,
      image_url: selected.image ? `${selected.image}/high.webp` : '',
    }
    if (confirmMode === 'grading') { onSelect(cardData); onClose(); return }
    onSelect({
      ...cardData,
      quantite: qty,
      prix_achat: parseFloat(prixAchat) || 0,
      valeur_loose: selected.pricing?.cardmarket?.avg7 || selected.pricing?.cardmarket?.avg30 || 0,
      date_achat: dateAchat || null,
      notes,
    })
    onClose()
  }

  if (!show) return null

  // Raretés présentes dans le set actuel
  const raretesPresentes = allCards.length > 0
    ? RARETES.filter(r => allCards.some(c => {
        const cr = (c.rarity || '').toLowerCase()
        return cr.includes(r.id.toLowerCase()) || r.id.toLowerCase().includes(cr)
      }))
    : []

  const cardsToShow = filteredCards.length > 0 ? filteredCards : (activeRarete ? [] : allCards)

  const breadcrumb = [
    { label: 'Séries', step: 'series' },
    selectedSerie && { label: selectedSerie.name, step: 'sets' },
    selectedSet && { label: selectedSet.name, step: 'items' },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="browser-modal modal" style={{ maxWidth: 800, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {mode === 'card' ? '🃏 Rechercher une carte' : '📦 Catalogue'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>✕</button>
          </div>

          {step !== 'confirm' && (
            <input
              placeholder="Recherche rapide... ex: Dracaufeu, Pikachu"
              value={query} onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 14, padding: '8px 12px' }}
              autoFocus
            />
          )}

          {/* Breadcrumb */}
          {step !== 'confirm' && step !== 'series' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={b.step}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>›</span>}
                  <button onClick={() => { setStep(b.step); setActiveRarete(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 12, color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--accent-bright)', fontWeight: i === breadcrumb.length - 1 ? 500 : 400, borderRadius: 4 }}>{b.label}</button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Filtres rareté */}
          {step === 'items' && raretesPresentes.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveRarete(null)} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: !activeRarete ? 'var(--accent)' : 'var(--bg-elevated)',
                color: !activeRarete ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${!activeRarete ? 'var(--accent)' : 'var(--border)'}`,
              }}>Toutes</button>
              {raretesPresentes.map(r => (
                <button key={r.id} onClick={() => setActiveRarete(activeRarete === r.id ? null : r.id)} style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: activeRarete === r.id ? r.color : r.bg,
                  color: activeRarete === r.id ? '#fff' : r.color,
                  border: `1px solid ${r.color}55`,
                  transition: 'all 0.15s',
                }}>{r.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</div>}

          {/* Résultats recherche */}
          {!loading && query.length >= 2 && searchResults.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
              {searchResults.map(card => (
                <CardItem key={card.id} card={card} onClick={() => handleSearchSelect(card)} />
              ))}
            </div>
          )}

          {/* Séries */}
          {!loading && query.length < 2 && step === 'series' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {series.map(serie => (
                <SerieItem key={serie.id} item={serie} onClick={() => selectSerie(serie)} />
              ))}
            </div>
          )}

          {/* Sets */}
          {!loading && query.length < 2 && step === 'sets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {sets.map(set => (
                <SerieItem key={set.id} item={set} sub={set.cardCount?.total ? `${set.cardCount.total} cartes` : null} onClick={() => selectSet(set)} />
              ))}
            </div>
          )}

          {/* Cartes du set */}
          {!loading && query.length < 2 && step === 'items' && (
            <>
              {cardsToShow.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
                  {cardsToShow.map(card => (
                    <CardItem key={card.localId || card.id} card={card} setId={selectedSet?.id} onClick={() => selectCard(card)} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Aucune carte pour cette rareté dans ce set.
                </div>
              )}
            </>
          )}

          {/* Confirmation */}
          {step === 'confirm' && selected && (
            <div>
              <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                  {selected.image
                    ? <img src={`${selected.image}/high.webp`} alt={selected.name} style={{ width: 120, borderRadius: 10, border: '2px solid var(--accent)' }} onError={e => e.target.style.display='none'} />
                    : <div style={{ width: 120, height: 168, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.3 }}>🃏</div>}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{selected.set?.name} · {selected.localId}/{selected.set?.cardCount?.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{selected.rarity}</div>
                  {(selected.pricing?.cardmarket?.avg7 || selected.pricing?.cardmarket?.avg30) && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      {selected.pricing.cardmarket.avg7 && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 12px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg 7j</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon-green)' }}>{selected.pricing.cardmarket.avg7.toFixed(2)} €</div>
                      </div>}
                      {selected.pricing.cardmarket.avg30 && <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '6px 12px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg 30j</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>{selected.pricing.cardmarket.avg30.toFixed(2)} €</div>
                      </div>}
                    </div>
                  )}
                  {confirmMode !== 'grading' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Quantité', el: <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value)||1)} /> },
                        { label: "Prix d'achat (€)", el: <input type="number" step="0.01" placeholder="0.00" value={prixAchat} onChange={e => setPrixAchat(e.target.value)} /> },
                        { label: "Date d'achat", el: <input type="date" value={dateAchat} onChange={e => setDateAchat(e.target.value)} /> },
                        { label: 'Notes', el: <input type="text" placeholder="Optionnel" value={notes} onChange={e => setNotes(e.target.value)} /> },
                      ].map(f => (
                        <div key={f.label}>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{f.label}</label>
                          {f.el}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep('items')} style={{ flex: 1 }}>← Retour</button>
                <button className="btn-primary" onClick={handleConfirm} style={{ flex: 2 }}>
                  {confirmMode === 'grading' ? '✅ Sélectionner cette carte' : '✅ Ajouter à la collection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SerieItem({ item, sub, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', borderRadius: 10, border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`, background: hovered ? 'var(--accent-dim)' : 'var(--bg-elevated)', padding: '12px 10px', transition: 'all 0.15s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {item.logo
        ? <img src={`${item.logo}.webp`} alt={item.name} style={{ height: 38, maxWidth: '90%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
        : <div style={{ fontSize: 22 }}>📦</div>}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.name}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function CardItem({ card, setId, onClick }) {
  const [hovered, setHovered] = useState(false)
  const imgSrc = card.image ? `${card.image}/low.webp` : (setId ? `https://assets.tcgdex.net/fr/${setId}/${card.localId}/low.webp` : null)
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-elevated)', transition: 'all 0.15s', transform: hovered ? 'translateY(-2px)' : 'none' }}>
      {imgSrc
        ? <img src={imgSrc} alt={card.name} style={{ width: '100%', display: 'block', aspectRatio: '2.5/3.5', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
        : <div style={{ aspectRatio: '2.5/3.5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.3 }}>🃏</div>}
      <div style={{ padding: '4px 5px 6px' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{card.localId}</div>
      </div>
    </div>
  )
}
