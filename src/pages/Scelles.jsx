import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import ItemModal from '../components/ItemModal'
import SealedPicker from '../components/SealedPicker'

const TYPE_OPTIONS = ['ETB', 'DISPLAY', 'ARSET', 'ARTSET', 'UPC', 'POKÉBOX', 'COFFRET DÉCOUVERTE', 'VALISETTE', 'BOITE COLLECTION']

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
  const [picker, setPicker] = useState(false)
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

  async function handlePickerSelect(data) {
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
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Scellés</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {filtered.length} produits · PA {formatEur(totaux.pa)} · Revente est. {formatEur(totaux.resell)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => { setEditing(null); setModal(true) }} style={{ fontSize: 12 }}>+ Manuel</button>
          <button className="btn-primary" onClick={() => setPicker(true)}>📦 Ajouter un scellé</button>
        </div>
      </div>

      <input placeholder="🔍 Filtrer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250, marginBottom: 16 }} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Logo</th>
                <th>Produit</th>
                <th>Type</th>
                <th>Qté</th>
                <th style={{ textAlign: 'right' }}>P.A. unit.</th>
                <th style={{ textAlign: 'right' }}>Retail</th>
                <th style={{ textAlign: 'right' }}>Revente</th>
                <th style={{ textAlign: 'right' }}>Total PA</th>
                <th style={{ textAlign: 'right' }}>P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const pnl = pctChange(s.resell || s.retail || 0, s.prix_achat || 0)
                const totalPA = (s.prix_achat || 0) * (s.quantite || 1)
                return (
                  <tr key={s.id}>
                    <td>
                      {s.image_url ? (
                        <img src={`${s.image_url}.webp`} alt={s.nom} style={{ height: 30, objectFit: 'contain' }}
                          onError={e => e.target.style.display = 'none'} />
                      ) : <div style={{ fontSize: 20 }}>📦</div>}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.nom}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.type_produit}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-bright)' }}>{s.quantite || 1}</td>
                    <td style={{ textAlign: 'right' }}>{formatEur(s.prix_achat || 0)}</td>
                    <td style={{ textAlign: 'right' }}>{formatEur(s.retail || 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--neon-green)' }}>{formatEur(s.resell || 0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEur(totalPA)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {s.prix_achat > 0 && pnl != null ? (
                        <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => { setEditing(s); setModal(true) }}>✏</button>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => setDeleting(s.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                  Aucun scellé. Clique sur "📦 Ajouter un scellé".
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
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

      <SealedPicker show={picker} onClose={() => setPicker(false)} onSelect={handlePickerSelect} />
      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }}
        onSave={handleSave} fields={FIELDS}
        title={editing ? 'Modifier le scellé' : 'Ajouter manuellement'}
        initialData={editing} />
    </div>
  )
}
