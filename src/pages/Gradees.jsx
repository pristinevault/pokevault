import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import SeriesBrowser from '../components/SeriesBrowser'

const GRADEURS = {
  PSA:     { notes: ['10','9','8.5','8','7.5','7','6.5','6','5','4','3','2','1'], color: '#e53e3e', special: [] },
  CGC:     { notes: ['10','9.5','9','8.5','8','7.5','7','6.5','6','5','4','3','2','1'], color: '#3182ce', special: ['PRISTINE'] },
  BGS:     { notes: ['10','9.5','9','8.5','8','7.5','7','6.5','6','5','4','3','2','1'], color: '#805ad5', special: ['BLACK LABEL'] },
  CCC:     { notes: ['10','9.5','9','8.5','8','7.5','7','6','5','4','3','2','1'], color: '#2f855a', special: ['GOLD LABEL','BLACK LABEL'] },
  PCA:     { notes: ['10','9.5','9','8.5','8','7','6','5','4','3','2','1'], color: '#c05621', special: [] },
  ACE:     { notes: ['10','9.5','9','8.5','8','7.5','7','6','5','4','3','2','1'], color: '#b7791f', special: [] },
  BECKETT: { notes: ['10','9.5','9','8.5','8','7.5','7','6.5','6','5','4','3','2','1'], color: '#2b6cb0', special: ['BLACK LABEL'] },
  TAG:     { notes: ['10','9.5','9','8.5','8','7','6','5','4','3','2','1'], color: '#553c9a', special: [] },
}

const NOTE_COLOR = {
  '10':'#f59e0b','PRISTINE':'#f59e0b','GOLD LABEL':'#f59e0b','BLACK LABEL':'#1a202c',
  '9.5':'#10b981','9':'#10b981','8.5':'#3b82f6','8':'#3b82f6',
  '7.5':'#94a3b8','7':'#94a3b8','6.5':'#94a3b8',
}

function GradeSelect({ gradeur, note, onNoteChange }) {
  if (!gradeur || !GRADEURS[gradeur]) return null
  const { notes, special } = GRADEURS[gradeur]
  return (
    <select value={note} onChange={e => onNoteChange(e.target.value)} style={{ width: '100%' }}>
      <option value="">— Note —</option>
      {special.length > 0 && <optgroup label="Spécial">{special.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>}
      <optgroup label="Notes">{notes.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>
    </select>
  )
}

function GradeBadge({ gradeur, note, size = 'normal' }) {
  const noteColor = NOTE_COLOR[note] || 'var(--text-muted)'
  const gradeurColor = GRADEURS[gradeur]?.color || 'var(--accent)'
  const sm = size === 'small'
  return (
    <div style={{ background: `${noteColor}22`, border: `1px solid ${noteColor}66`, borderRadius: sm ? 6 : 8, padding: sm ? '3px 7px' : '5px 10px', display: 'flex', alignItems: 'center', gap: sm ? 4 : 6, backdropFilter: 'blur(4px)' }}>
      <div style={{ fontSize: sm ? 9 : 10, fontWeight: 800, color: gradeurColor, background: `${gradeurColor}22`, border: `1px solid ${gradeurColor}44`, borderRadius: 4, padding: sm ? '1px 3px' : '1px 5px', letterSpacing: '0.5px', flexShrink: 0 }}>{gradeur}</div>
      <div style={{ fontSize: sm ? 11 : 16, fontWeight: 800, color: noteColor, lineHeight: 1 }}>{note}</div>
    </div>
  )
}

const EMPTY = { pokemon: '', serie: '', numero: '', gradeur: 'PSA', note: '', prix_achat: '', valeur: '', loose: '', date_gradage: '', notes: '', image_url: '' }

export default function Gradees({ gradees, userId, onRefresh }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [browser, setBrowser] = useState(false)

  const totaux = useMemo(() => ({
    pa: gradees.reduce((a, g) => a + (g.prix_achat || 0), 0),
    val: gradees.reduce((a, g) => a + (g.valeur || 0), 0),
  }), [gradees])

  function openAdd(mode) {
    setForm(EMPTY); setEditing(null); setImageFile(null); setImagePreview(null)
    if (mode === 'search') setBrowser(true)
    else setModal(true)
  }

  function openEdit(g) {
    setForm({ ...g, prix_achat: g.prix_achat ?? '', valeur: g.valeur ?? '', loose: g.loose ?? '' })
    setEditing(g); setImageFile(null); setImagePreview(g.image_url || null); setModal(true)
  }

  // Appelé depuis TCGdex browser — pré-remplit et ouvre le modal
  function handleBrowserSelect(cardData) {
    setForm(f => ({
      ...EMPTY,
      gradeur: f.gradeur || 'PSA',
      pokemon: cardData.pokemon || '',
      serie: cardData.serie || '',
      numero: cardData.numero || '',
      image_url: cardData.image_url || '',
    }))
    setImagePreview(cardData.image_url || null)
    setImageFile(null)
    setBrowser(false)
    setModal(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(currentImageUrl) {
    if (!imageFile) return currentImageUrl || null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const path = `gradees/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pokevault').upload(path, imageFile, { upsert: true })
    setUploading(false)
    if (error) return currentImageUrl || null
    const { data } = supabase.storage.from('pokevault').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.gradeur || !form.note) {
      alert('Merci de sélectionner un gradeur et une note.')
      return
    }
    setSaving(true)
    const imageUrl = await uploadImage(form.image_url || editing?.image_url || null)
    const payload = {
      pokemon: form.pokemon || null,
      serie: form.serie || null,
      numero: form.numero || null,
      gradeur: form.gradeur,
      note: form.note,
      prix_achat: parseFloat(form.prix_achat) || 0,
      valeur: parseFloat(form.valeur) || 0,
      loose: parseFloat(form.loose) || 0,
      date_gradage: form.date_gradage || null,
      notes: form.notes || null,
      image_url: imageUrl,
      user_id: userId,
    }
    let result
    if (editing) {
      result = await supabase.from('gradees').update(payload).eq('id', editing.id)
    } else {
      result = await supabase.from('gradees').insert(payload)
    }
    setSaving(false)
    if (result.error) {
      alert(`Erreur lors de la sauvegarde : ${result.error.message}`)
      return
    }
    setModal(false)
    setEditing(null)
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview(null)
    onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('gradees').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Cartes Gradées</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {gradees.length} cartes · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => openAdd('manual')}>+ Manuel</button>
          <button className="btn-primary" onClick={() => openAdd('search')}>🔍 Ajouter une carte</button>
        </div>
      </div>

      <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {gradees.map(g => {
          const pnl = pctChange(g.valeur || 0, g.prix_achat || 0)
          const premium = g.loose > 0 ? ((g.valeur || 0) / g.loose - 1) * 100 : null
          return (
            <div key={g.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative', background: 'var(--bg-elevated)', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                {g.image_url
                  ? <img src={g.image_url} alt={g.pokemon} style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ fontSize: 48, opacity: 0.15 }}>🃏</div>}
                {g.gradeur && g.note && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <GradeBadge gradeur={g.gradeur} note={g.note} />
                  </div>
                )}
              </div>
              <div style={{ padding: '11px 13px 13px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.pokemon || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{g.serie}{g.numero ? ` · ${g.numero}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>P.A.</div><div style={{ fontSize: 12, fontWeight: 500 }}>{formatEur(g.prix_achat || 0)}</div></div>
                  <div><div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Valeur</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatEur(g.valeur || 0)}</div></div>
                  {g.loose > 0 && <div><div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Loose</div><div style={{ fontSize: 11 }}>{formatEur(g.loose)}</div></div>}
                  {premium != null && <div><div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Premium</div><div style={{ fontSize: 11, color: premium >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>{premium >= 0 ? '+' : ''}{premium.toFixed(0)}%</div></div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {g.prix_achat > 0 && pnl != null ? <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span> : <span />}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: '3px 7px', fontSize: 10 }} onClick={() => openEdit(g)}>✏</button>
                    <button className="btn-danger" style={{ padding: '3px 7px', fontSize: 10 }} onClick={() => setDeleting(g.id)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {!gradees.length && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            Aucune carte gradée. Clique sur "🔍 Ajouter une carte".
          </div>
        )}
      </div>

      {/* Modal ajout/édition */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{editing ? 'Modifier la carte' : 'Ajouter une carte gradée'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 100, height: 140, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {imagePreview ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setImagePreview(null)} /> : <span style={{ fontSize: 32, opacity: 0.2 }}>🃏</span>}
                  {form.gradeur && form.note && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4 }}><GradeBadge gradeur={form.gradeur} note={form.note} size="small" /></div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 10, marginTop: 6, width: 100 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Pokémon</label>
                  <input value={form.pokemon || ''} placeholder="ex: Dracaufeu" onChange={e => set('pokemon', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Série</label>
                    <input value={form.serie || ''} placeholder="ex: SFAFR" onChange={e => set('serie', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Numéro</label>
                    <input value={form.numero || ''} placeholder="ex: 75/64" onChange={e => set('numero', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gradation */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Gradation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Société</label>
                  <select value={form.gradeur} onChange={e => { set('gradeur', e.target.value); set('note', '') }}>
                    {Object.keys(GRADEURS).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Note</label>
                  <GradeSelect gradeur={form.gradeur} note={form.note} onNoteChange={v => set('note', v)} />
                </div>
              </div>
              {form.gradeur && form.note && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                  <GradeBadge gradeur={form.gradeur} note={form.note} />
                </div>
              )}
            </div>

            {/* Prix */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[['P.A. (€)', 'prix_achat'], ['Valeur gradée (€)', 'valeur'], ['Valeur loose (€)', 'loose']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type="number" step="0.01" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Date de gradage</label>
                <input type="date" value={form.date_gradage || ''} onChange={e => set('date_gradage', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Notes</label>
                <input value={form.notes || ''} placeholder="Optionnel" onChange={e => set('notes', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || uploading} style={{ flex: 2 }}>
                {saving || uploading ? '⟳ Sauvegarde...' : editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 340, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Supprimer cette carte ?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <SeriesBrowser show={browser} onClose={() => setBrowser(false)} onSelect={handleBrowserSelect} mode="card" confirmMode="grading" />
    </div>
  )
}
