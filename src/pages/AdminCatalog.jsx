import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'pristinevaultsas@gmail.com'
const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION', 'BOOSTER']
const EMPTY = { nom: '', type_produit: 'ETB', serie: '', retail_fr: '', release_date: '', actif: true, image_url: '' }

export default function AdminCatalog({ user }) {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => { fetchCatalog() }, [])

  async function fetchCatalog() {
    setLoading(true)
    const { data } = await supabase.from('sealed_catalog').select('*').order('created_at', { ascending: false })
    setCatalog(data || [])
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY); setEditing(null); setImageFile(null); setImagePreview(null); setModal(true)
  }
  function openEdit(item) {
    setForm({ ...item, retail_fr: item.retail_fr || '' })
    setEditing(item); setImageFile(null); setImagePreview(item.image_url || null); setModal(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage() {
    if (!imageFile) return editing?.image_url || null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const path = `catalog/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pokevault').upload(path, imageFile, { upsert: true })
    if (error) { setUploading(false); return editing?.image_url || null }
    const { data } = supabase.storage.from('pokevault').getPublicUrl(path)
    setUploading(false); return data.publicUrl
  }

  async function handleSave() {
    setSaving(true)
    const imageUrl = await uploadImage()
    const payload = {
      nom: form.nom,
      type_produit: form.type_produit,
      serie: form.serie,
      retail_fr: parseFloat(form.retail_fr) || 0,
      release_date: form.release_date || null,
      actif: form.actif,
      image_url: imageUrl,
    }
    if (editing) {
      await supabase.from('sealed_catalog').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('sealed_catalog').insert(payload)
    }
    setSaving(false); setModal(false); fetchCatalog()
  }

  async function handleDelete(id) {
    await supabase.from('sealed_catalog').delete().eq('id', id)
    setDeleting(null); fetchCatalog()
  }

  async function toggleActif(item) {
    await supabase.from('sealed_catalog').update({ actif: !item.actif }).eq('id', item.id)
    fetchCatalog()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = catalog.filter(c => {
    const matchSearch = !search || (c.nom || '').toLowerCase().includes(search.toLowerCase()) || (c.serie || '').toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || c.type_produit === filterType
    return matchSearch && matchType
  })

  const TYPE_COLOR = { ETB: '#8b5cf6', DISPLAY: '#10b981', ARSET: '#3b82f6', BOOSTER: '#f59e0b', POKÉBOX: '#ec4899' }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Accès restreint</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cette section est réservée à l'administrateur Pristine Vault.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Catalogue Scellés</h1>
            <span style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: 'var(--accent-bright)' }}>ADMIN</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {catalog.length} produits · {catalog.filter(c => c.actif).length} actifs · Visible par tous les utilisateurs
          </div>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Ajouter un produit</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 150 }}>
          <option value="">Tous les types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Grille catalogue */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          {filtered.map(item => {
            const typeColor = TYPE_COLOR[item.type_produit] || 'var(--accent)'
            return (
              <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: item.actif ? 1 : 0.5 }}>
                <div style={{ position: 'relative', background: 'var(--bg-elevated)', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.nom} style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ fontSize: 50, opacity: 0.2 }}>📦</div>}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <span style={{ background: `${typeColor}22`, border: `1px solid ${typeColor}55`, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: typeColor }}>{item.type_produit}</span>
                  </div>
                  {!item.actif && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 600, color: 'var(--neon-red)' }}>MASQUÉ</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {item.serie && <span>{item.serie} · </span>}
                    {item.retail_fr > 0 && <span style={{ color: 'var(--neon-green)' }}>{item.retail_fr} €</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ flex: 1, padding: '4px 6px', fontSize: 10 }} onClick={() => openEdit(item)}>✏ Éditer</button>
                    <button onClick={() => toggleActif(item)} style={{
                      padding: '4px 8px', fontSize: 10, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
                      background: item.actif ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: item.actif ? 'var(--neon-green)' : 'var(--neon-red)'
                    }}>{item.actif ? '👁' : '🚫'}</button>
                    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setDeleting(item.id)}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
          {!filtered.length && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              {catalog.length === 0 ? 'Catalogue vide. Commence par ajouter des produits !' : 'Aucun résultat.'}
            </div>
          )}
        </div>
      )}

      {/* Modal ajout/édition */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{editing ? 'Modifier le produit' : 'Ajouter au catalogue'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Upload image */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Photo du produit</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 100, height: 120, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 30, opacity: 0.3 }}>📦</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 12, padding: '6px 8px', marginBottom: 8 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Photo officielle du produit scellé</div>
                  {editing?.image_url && !imageFile && (
                    <div style={{ fontSize: 10, color: 'var(--neon-green)', marginTop: 4 }}>✅ Image existante conservée</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Nom du produit *</label>
                <input value={form.nom} placeholder="ex: ETB Écarlate et Violet — Mascarade Crépusculaire" onChange={e => set('nom', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Type *</label>
                <select value={form.type_produit} onChange={e => set('type_produit', e.target.value)}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Série / Extension</label>
                <input value={form.serie} placeholder="ex: Mascarade Crépusculaire" onChange={e => set('serie', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prix retail FR (€)</label>
                <input type="number" step="0.01" value={form.retail_fr} placeholder="0.00" onChange={e => set('retail_fr', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Date de sortie</label>
                <input type="date" value={form.release_date || ''} onChange={e => set('release_date', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => set('actif', e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                <label htmlFor="actif" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>Visible dans le catalogue</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn-ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || uploading || !form.nom} style={{ flex: 2 }}>
                {saving || uploading ? '⟳ Sauvegarde...' : editing ? '✅ Mettre à jour' : '✅ Ajouter au catalogue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <h3 style={{ marginBottom: 8 }}>Supprimer ce produit du catalogue ?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              Il sera retiré pour tous les utilisateurs. Les items déjà ajoutés à leurs collections ne seront pas affectés.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
