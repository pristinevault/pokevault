import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import ItemModal from '../components/ItemModal'

const LANGUE_OPTIONS = ['FR', 'JP', 'EN', 'DE', 'IT', 'ES']
const FIELDS = [
  { key: 'pokemon', label: 'Pokémon illustré', type: 'text', placeholder: 'ex: Dracaufeu' },
  { key: 'serie', label: 'Série', type: 'text', placeholder: 'ex: OBFFR' },
  { key: 'illustration', label: 'Illustration / artiste', type: 'text', placeholder: 'ex: Mitsuhiro Arita' },
  { key: 'langue', label: 'Langue', type: 'select', options: LANGUE_OPTIONS },
  { key: 'prix_achat', label: "Prix d'achat (€)", type: 'number', step: 0.01, default: 0 },
  { key: 'valeur_loose', label: 'Valeur estimée (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'gradeur', label: 'Gradeur (optionnel)', type: 'text', placeholder: 'ex: PSA' },
  { key: 'note', label: 'Note (si gradé)', type: 'text', placeholder: 'ex: 9.5' },
  { key: 'date_achat', label: "Date d'achat", type: 'date' },
  { key: 'top_hit', label: 'Top hit extrait ?', type: 'select', options: ['Non', 'Oui'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Boosters({ boosters, userId, onRefresh }) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return boosters
    return boosters.filter(b =>
      (b.pokemon || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.serie || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [boosters, search])

  const totaux = useMemo(() => ({
    pa: filtered.reduce((a, b) => a + (b.prix_achat || 0), 0),
    val: filtered.reduce((a, b) => a + (b.valeur_loose || 0), 0),
  }), [filtered])

  async function handleSave(form) {
    const payload = { ...form, user_id: userId }
    if (editing) await supabase.from('boosters').update(payload).eq('id', editing.id)
    else await supabase.from('boosters').insert(payload)
    setModal(false); setEditing(null); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('boosters').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Boosters Art</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {filtered.length} boosters · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setModal(true) }}>+ Ajouter</button>
      </div>

      <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250, marginBottom: 16 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {filtered.map(b => {
          const pnl = pctChange(b.valeur_loose || 0, b.prix_achat || 0)
          return (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{b.pokemon || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.serie} · {b.langue}</div>
                </div>
                {b.langue && (
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>{b.langue}</span>
                )}
              </div>
              {b.illustration && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, fontStyle: 'italic' }}>
                  {b.illustration}
                </div>
              )}
              {b.gradeur && (
                <div style={{ fontSize: 12, color: 'var(--neon-amber)', marginBottom: 8 }}>
                  {b.gradeur} {b.note}
                </div>
              )}
              {b.top_hit === 'Oui' && (
                <div style={{ fontSize: 11, marginBottom: 8 }}>
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--neon-amber)', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ Top Hit</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>P.A.</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{formatEur(b.prix_achat || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Valeur</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{formatEur(b.valeur_loose || 0)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {b.prix_achat > 0 && pnl != null ? (
                  <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                ) : <span />}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setEditing(b); setModal(true) }}>✏</button>
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setDeleting(b.id)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Aucun booster art.</div>
        )}
      </div>

      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Supprimer ce booster ?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }}
        onSave={handleSave} fields={FIELDS}
        title={editing ? 'Modifier le booster' : 'Ajouter un booster art'}
        initialData={editing} />
    </div>
  )
}
