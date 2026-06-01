import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import CatalogBrowser from '../components/CatalogBrowser'

const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION', 'BOOSTER']
const TYPE_COLOR = { ETB: '#8b5cf6', DISPLAY: '#10b981', ARSET: '#3b82f6', BOOSTER: '#f59e0b', POKÉBOX: '#ec4899' }
const EMPTY = { nom: '', type_produit: 'ETB', quantite: 1, prix_achat: '', retail: '', resell: '', date_achat: '', notes: '', image_url: '' }

export default function Scelles({ scelles, userId, onRefresh }) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    let data = [...scelles]
    if (search) data = data.filter(s => (s.nom || '').toLowerCase().includes(search.toLowerCase()))
    if (filterType) data = data.filter(s => s.type_produit === filterType)
    return data
  }, [scelles, search, filterType])

  const totaux = useMemo(() => ({
    pa: filtered.reduce((a, s) => a + (s.prix_achat || 0) * (s.quantite || 1), 0),
    resell: filtered.reduce((a, s) => a + (s.resell || s.retail || 0) * (s.quantite || 1), 0),
  }), [filtered])

  function openEdit(s) {
    setForm({ ...s, prix_achat: s.prix_achat || '', retail: s.retail || '', resell: s.resell || '' })
    setEditing(s); setImageFile(null); setImagePreview(s.image_url || null); setManualOpen(true)
  }
  function openManualAdd() {
    setForm(EMPTY); setEditing(null); setImageFile(null); setImagePreview(null); setManualOpen(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage() {
    if (!imageFile) return editing?.image_url || null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const path = `scelles/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pokevault').upload(path, imageFile, { upsert: true })
    if (error) { setUploading(false); return editing?.image_url || null }
    const { data } = supabase.storage.from('pokevault').getPublicUrl(path)
    setUploading(false); return data.publicUrl
  }

  async function handleCatalogSelect(data) {
    await supabase.from('scelles').insert({ ...data, user_id: userId })
    onRefresh()
  }

  async function handleManualSave() {
    setSaving(true)
    const imageUrl = await uploadImage()
    const payload = {
      nom: form.nom, type_produit: form.type_produit,
      quantite: parseInt(form.quantite) || 1,
      prix_achat: parseFloat(form.prix_achat) || 0,
      retail: parseFloat(form.retail) || 0,
      resell: parseFloat(form.resell) || 0,
      date_achat: form.date_achat || null,
      notes: form.notes,
      image_url: imageUrl,
      user_id: userId,
    }
    if (editing) await supabase.from('scelles').update(payload).eq('id', editing.id)
    else await supabase.from('scelles').insert(payload)
    setSaving(false); setManualOpen(false); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('scelles').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Scellés & Boosters Art</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {filtered.length} produits · PA {formatEur(totaux.pa)} · Revente est. {formatEur(totaux.resell)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={openManualAdd} style={{ fontSize: 12 }}>+ Manuel</button>
          <button className="btn-primary" onClick={() => setCatalogOpen(true)}>📦 Ajouter depuis le catalogue</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Filtrer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 160 }}>
          <option value="">Tous les types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {filtered.map(s => {
          const pnl = pctChange(s.resell || s.retail || 0, s.prix_achat || 0)
          const typeColor = TYPE_COLOR[s.type_produit] || 'var(--accent)'
          return (
            <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative', background: 'var(--bg-elevated)', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                {s.image_url
                  ? <img src={s.image_url} alt={s.nom} style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                  : <div style={{ fontSize: 52, opacity: 0.2 }}>📦</div>}
                {s.quantite > 1 && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>×{s.quantite}</div>}
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                  <span style={{ background: `${typeColor}22`, border: `1px solid ${typeColor}55`, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: typeColor }}>{s.type_produit}</span>
                </div>
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nom}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>P.A. unit.</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{formatEur(s.prix_achat || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>Revente</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neon-green)' }}>{formatEur(s.resell || 0)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {s.prix_achat > 0 && pnl != null
                    ? <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                    : <span />}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => openEdit(s)}>✏</button>
                    <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setDeleting(s.id)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ marginBottom: 16 }}>Aucun scellé dans ta collection.</div>
            <button className="btn-primary" onClick={() => setCatalogOpen(true)}>📦 Parcourir le catalogue</button>
          </div>
        )}
      </div>

      {/* Modal ajout manuel */}
      {manualOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setManualOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{editing ? 'Modifier le scellé' : 'Ajout manuel'}</h2>
              <button onClick={() => setManualOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Photo du produit</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 90, height: 110, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {imagePreview ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 26, opacity: 0.4 }}>📦</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 12, padding: '6px 8px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Nom du produit</label>
                <input value={form.nom} placeholder="ex: ETB Mascarade Crépusculaire" onChange={e => set('nom', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Type</label>
                <select value={form.type_produit} onChange={e => set('type_produit', e.target.value)}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Quantité</label>
                <input type="number" min={1} value={form.quantite} onChange={e => set('quantite', e.target.value)} />
              </div>
              {[
                { label: "Prix d'achat (€)", key: 'prix_achat' },
                { label: 'Retail (€)', key: 'retail' },
                { label: 'Revente estimée (€)', key: 'resell' },
                { label: "Date d'achat", key: 'date_achat', type: 'date' },
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
              <button className="btn-ghost" onClick={() => setManualOpen(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={handleManualSave} disabled={saving || uploading} style={{ flex: 2 }}>
                {saving || uploading ? '⟳ Sauvegarde...' : editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Supprimer ce produit ?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <CatalogBrowser show={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={handleCatalogSelect} />
    </div>
  )
}
