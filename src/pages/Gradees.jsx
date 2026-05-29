import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange } from '../lib/api'
import ItemModal from '../components/ItemModal'

const GRADEUR_OPTIONS = ['PSA', 'CGC', 'BGS', 'CCC', 'PCA', 'ACE']
const NOTE_OPTIONS = ['10', '9.5', '9', '8.5', '8', '7.5', '7']

const FIELDS = [
  { key: 'pokemon', label: 'Pokémon', type: 'text', placeholder: 'ex: Dracaufeu' },
  { key: 'serie', label: 'Série', type: 'text', placeholder: 'ex: SFAFR' },
  { key: 'numero', label: 'Numéro', type: 'text', placeholder: 'ex: 75/64' },
  { key: 'gradeur', label: 'Gradeur', type: 'select', options: GRADEUR_OPTIONS },
  { key: 'note', label: 'Note', type: 'select', options: NOTE_OPTIONS },
  { key: 'prix_achat', label: "Prix d'achat (€)", type: 'number', step: 0.01, default: 0 },
  { key: 'valeur', label: 'Valeur estimée (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'loose', label: 'Valeur loose (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'date_gradage', label: 'Date de gradage', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

const NOTE_COLOR = {
  '10': '#f59e0b', '9.5': '#10b981', '9': '#10b981',
  '8.5': '#3b82f6', '8': '#3b82f6', '7.5': '#94a3b8', '7': '#94a3b8'
}

export default function Gradees({ gradees, userId, onRefresh }) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const totaux = useMemo(() => ({
    pa: gradees.reduce((a, g) => a + (g.prix_achat || 0), 0),
    val: gradees.reduce((a, g) => a + (g.valeur || 0), 0),
  }), [gradees])

  async function handleSave(form) {
    const payload = { ...form, user_id: userId }
    if (editing) await supabase.from('gradees').update(payload).eq('id', editing.id)
    else await supabase.from('gradees').insert(payload)
    setModal(false); setEditing(null); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('gradees').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Cartes Gradées</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {gradees.length} dalles · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setModal(true) }}>+ Ajouter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {gradees.map(g => {
          const pnl = pctChange(g.valeur || 0, g.prix_achat || 0)
          const noteColor = NOTE_COLOR[g.note] || 'var(--text-muted)'
          const premium = g.loose > 0 ? ((g.valeur || 0) / g.loose - 1) * 100 : null
          return (
            <div key={g.id} className="card" style={{ position: 'relative' }}>
              {/* Note badge */}
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: `${noteColor}20`, border: `1px solid ${noteColor}50`,
                borderRadius: 8, padding: '4px 10px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 10, color: noteColor, fontWeight: 600, textTransform: 'uppercase' }}>{g.gradeur}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: noteColor, lineHeight: 1 }}>{g.note}</div>
              </div>

              <div style={{ paddingRight: 70 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {g.pokemon || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {g.serie} · {g.numero}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>P.A.</div>
                  <div style={{ fontWeight: 500 }}>{formatEur(g.prix_achat || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Valeur</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatEur(g.valeur || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Loose</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatEur(g.loose || 0)}</div>
                </div>
                {premium != null && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Premium grade</div>
                    <div style={{ fontSize: 12, color: premium >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                      {premium >= 0 ? '+' : ''}{premium.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {g.prix_achat > 0 && pnl != null ? (
                  <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                ) : <span />}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setEditing(g); setModal(true) }}>✏</button>
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setDeleting(g.id)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
        {!gradees.length && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            Aucune carte gradée.
          </div>
        )}
      </div>

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

      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }}
        onSave={handleSave} fields={FIELDS}
        title={editing ? 'Modifier la dalle' : 'Ajouter une dalle gradée'}
        initialData={editing} />
    </div>
  )
}
