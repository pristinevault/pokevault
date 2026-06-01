import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import ItemModal from '../components/ItemModal'
import SeriesBrowser from '../components/SeriesBrowser'

const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION', 'BOOSTER']

const FIELDS = [
  { key: 'nom', label: 'Nom du produit', type: 'text', placeholder: 'ex: ETB EV7' },
  { key: 'type_produit', label: 'Type', type: 'select', options: TYPE_OPTIONS },
  { key: 'quantite', label: 'Quantité', type: 'number', default: 1, step: 1 },
  { key: 'prix_achat', label: "Prix d'achat (€)", type: 'number', step: 0.01, default: 0 },
  { key: 'retail', label: 'Prix retail (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'resell', label: 'Prix revente estimé (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'date_achat', label: "Date d'achat", type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Scelles({ scelles, userId, onRefresh }) {
  const [browser, setBrowser] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const filtered = useMemo(() => {
    if (!search) return scelles
    return scelles.filter(s => (s.nom || '').toLowerCase().includes(search.toLowerCase()))
  }, [scelles, search])

  const totaux = useMemo(() => ({
    pa: filtered.reduce((a, s) => a + (s.prix_achat || 0) * (s.quantite || 1), 0),
    resell: filtered.reduce((a, s) => a + (s.resell || s.retail || 0) * (s.quantite || 1), 0),
  }), [filtered])

  async function handleBrowserSelect(data) {
    await supabase.from('scelles').insert({ ...data, user_id: userId })
    onRefresh()
  }

  async function handleSave(form) {
    const payload = { ...form, user_id: userId }
    if (editing) await supabase.from('scelles').update(payload).eq('id', editing.id)
    else await supabase.from('scelles').insert(payload)
    setModal(false); setEditing(null); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('scelles').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

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
          <button className="btn-ghost" onClick={() => { setEditing(null); setModal(true) }} style={{ fontSize: 12 }}>+ Manuel</button>
          <button className="btn-primary" onClick={() => setBrowser(true)}>📦 Ajouter un scellé</button>
        </div>
      </div>

      <input placeholder="🔍 Filtrer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250, marginBottom: 16 }} />

      {/* Grid scellés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {filtered.map(s => {
          const pnl = pctChange(s.resell || s.retail || 0, s.prix_achat || 0)
          const totalPA = (s.prix_achat || 0) * (s.quantite || 1)
          return (
            <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Image produit ou logo set */}
              <div style={{ position: 'relative', background: 'var(--bg-elevated)', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                {s.image_url
                  ? <img src={s.image_url.includes('http') ? s.image_url : `${s.image_url}.webp`} alt={s.nom}
                      style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none' }} />
                  : <div style={{ fontSize: 48 }}>📦</div>}
                {s.quantite > 1 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>×{s.quantite}</div>
                )}
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{s.type_produit}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>P.A.</div>
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
                    <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => { setEditing(s); setModal(true) }}>✏</button>
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
            Aucun scellé. Clique sur "📦 Ajouter un scellé".
          </div>
        )}
      </div>

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

      <SeriesBrowser show={browser} onClose={() => setBrowser(false)} onSelect={handleBrowserSelect} mode="sealed" />
      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }} onSave={handleSave} fields={FIELDS} title={editing ? 'Modifier le scellé' : 'Ajouter manuellement'} initialData={editing} />
    </div>
  )
}
