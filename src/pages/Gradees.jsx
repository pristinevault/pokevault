import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'

const GRADEUR_OPTIONS = ['PSA', 'CGC', 'BGS', 'CCC', 'PCA', 'ACE']
const NOTE_COLOR = { '10': '#f59e0b', '9.5': '#10b981', '9': '#10b981', '8.5': '#3b82f6', '8': '#3b82f6', '7.5': '#94a3b8', '7': '#94a3b8' }

const EMPTY = { pokemon: '', serie: '', numero: '', gradeur: '', note: '', prix_achat: '', valeur: '', loose: '', date_gradage: '', notes: '', image_url: '' }

export default function Gradees({ gradees, userId, onRefresh }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const totaux = useMemo(() => ({
    pa: gradees.reduce((a, g) => a + (g.prix_achat || 0), 0),
    val: gradees.reduce((a, g) => a + (g.valeur || 0), 0),
  }), [gradees])

  function openAdd() {
    setForm(EMPTY); setEditing(null); setImageFile(null); setImagePreview(null); setModal(true)
  }
  function openEdit(g) {
    setForm({ ...g, prix_achat: g.prix_achat || '', valeur: g.valeur || '', loose: g.loose || '' })
    setEditing(g); setImageFile(null); setImagePreview(g.image_url || null); setModal(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage() {
    if (!imageFile) return editing?.image_url || null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const path = `gradees/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pokevault').upload(path, imageFile, { upsert: true })
    if (error) { setUploading(false); return editing?.image_url || null }
    const { data } = supabase.storage.from('pokevault').getPublicUrl(path)
    setUploading(false)
    return data.publicUrl
  }

  async function handleSave() {
    const imageUrl = await uploadImage()
    const payload = {
      pokemon: form.pokemon, serie: form.serie, numero: form.numero,
      gradeur: form.gradeur, note: form.note,
      prix_achat: parseFloat(form.prix_achat) || 0,
      valeur: parseFloat(form.valeur) || 0,
      loose: parseFloat(form.loose) || 0,
      date_gradage: form.date_gradage || null,
      notes: form.notes,
      image_url: imageUrl,
      user_id: userId,
    }
    if (editing) await supabase.from('gradees').update(payload).eq('id', editing.id)
    else await supabase.from('gradees').insert(payload)
    setModal(false); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('gradees').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Cartes Gradées</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {gradees.length} dalles · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Ajouter une dalle</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {gradees.map(g => {
          const pnl = pctChange(g.valeur || 0, g.prix_achat || 0)
          const noteColor = NOTE_COLOR[g.note] || 'var(--text-muted)'
          const premium = g.loose > 0 ? ((g.valeur || 0) / g.loose - 1) * 100 : null
          return (
            <div key={g.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Image */}
              <div style={{ position: 'relative', background: 'var(--bg-elevated)', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {g.image_url
                  ? <img src={g.image_url} alt={g.pokemon} style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ fontSize: 50, opacity: 0.3 }}>🏆</div>}
                {/* Note badge */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: `${noteColor}22`, border: `1px solid ${noteColor}66`,
                  borderRadius: 8, padding: '4px 10px', textAlign: 'center', backdropFilter: 'blur(4px)'
                }}>
                  <div style={{ fontSize: 9, color: noteColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{g.gradeur}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: noteColor, lineHeight: 1.1 }}>{g.note}</div>
                </div>
              </div>

              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{g.pokemon || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{g.serie} · {g.numero}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>P.A.</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{formatEur(g.prix_achat || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Valeur gradée</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatEur(g.valeur || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Loose</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatEur(g.loose || 0)}</div>
                  </div>
                  {premium != null && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Premium</div>
                      <div style={{ fontSize: 11, color: premium >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>{premium >= 0 ? '+' : ''}{premium.toFixed(0)}%</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {g.prix_achat > 0 && pnl != null
                    ? <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                    : <span />}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => openEdit(g)}>✏</button>
                    <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setDeleting(g.id)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {!gradees.length && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            Aucune dalle gradée.
          </div>
        )}
      </div>

      {/* Modal ajout/édition */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{editing ? 'Modifier la dalle' : 'Ajouter une dalle gradée'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Upload image */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Photo de la dalle</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 100, height: 120, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 28, opacity: 0.4 }}>📷</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 12, padding: '6px 8px' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>JPG, PNG, WEBP — photo de ta dalle gradée</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Pokémon', key: 'pokemon', placeholder: 'ex: Dracaufeu' },
                { label: 'Série', key: 'serie', placeholder: 'ex: SFAFR' },
                { label: 'Numéro', key: 'numero', placeholder: 'ex: 75/64' },
              ].map(f => (
                <div key={f.key} style={f.key === 'pokemon' ? { gridColumn: '1/-1' } : {}}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <input value={form[f.key] || ''} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Gradeur</label>
                <select value={form.gradeur} onChange={e => set('gradeur', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {GRADEUR_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Note</label>
                <select value={form.note} onChange={e => set('note', e.target.value)}>
                  <option value="">— Note —</option>
                  {['10', '9.5', '9', '8.5', '8', '7.5', '7'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {[
                { label: "Prix d'achat (€)", key: 'prix_achat' },
                { label: 'Valeur gradée (€)', key: 'valeur' },
                { label: 'Valeur loose (€)', key: 'loose' },
                { label: 'Date de gradage', key: 'date_gradage', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type || 'number'} step="0.01" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={uploading} style={{ flex: 2 }}>
                {uploading ? 'Upload...' : editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Supprimer cette dalle ?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
