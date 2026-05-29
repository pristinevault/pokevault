import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur, formatPct, pctChange, SERIE_MAP } from '../lib/api'
import ItemModal from '../components/ItemModal'

const RARETE_OPTIONS = ['GOLD', 'ALT', 'AR', 'FULL ART', 'FULL ART SHINY', 'EX', 'VMAX', 'VSTAR', 'V', 'TERRACRISTAL', 'RADIEUX', 'RAINBOW', 'HOLO', 'SHINY', 'TG', 'POKEBALL', 'ESCOUADE', 'GX', 'AMAZING']
const SERIE_OPTIONS = Object.keys(SERIE_MAP).sort()

const FIELDS = [
  { key: 'quantite', label: 'Quantité', type: 'number', default: 1, step: 1 },
  { key: 'pokemon', label: 'Pokémon / Nom', type: 'text', placeholder: 'ex: Dracaufeu' },
  { key: 'serie', label: 'Série', type: 'select', options: SERIE_OPTIONS },
  { key: 'rarete', label: 'Rareté', type: 'select', options: RARETE_OPTIONS },
  { key: 'numero', label: 'Numéro', type: 'text', placeholder: 'ex: 253/198' },
  { key: 'prix_achat', label: "Prix d'achat (€)", type: 'number', step: 0.01, default: 0 },
  { key: 'valeur_loose', label: 'Valeur estimée (€)', type: 'number', step: 0.01, default: 0 },
  { key: 'date_achat', label: "Date d'achat", type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Cartes({ cartes, userId, onRefresh }) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterRarete, setFilterRarete] = useState('')
  const [sortBy, setSortBy] = useState('valeur_desc')
  const [deleting, setDeleting] = useState(null)

  const filtered = useMemo(() => {
    let data = [...cartes]
    if (search) data = data.filter(c =>
      (c.pokemon || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.serie || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.numero || '').includes(search)
    )
    if (filterRarete) data = data.filter(c => c.rarete === filterRarete)
    switch (sortBy) {
      case 'valeur_desc': data.sort((a, b) => (b.valeur_loose || 0) * (b.quantite || 1) - (a.valeur_loose || 0) * (a.quantite || 1)); break
      case 'pnl_desc': data.sort((a, b) => {
        const pnlA = (a.valeur_loose || 0) * (a.quantite || 1) - (a.prix_achat || 0) * (a.quantite || 1)
        const pnlB = (b.valeur_loose || 0) * (b.quantite || 1) - (b.prix_achat || 0) * (b.quantite || 1)
        return pnlB - pnlA
      }); break
      case 'serie': data.sort((a, b) => (a.serie || '').localeCompare(b.serie || '')); break
      case 'recent': break
    }
    return data
  }, [cartes, search, filterRarete, sortBy])

  const totaux = useMemo(() => ({
    pa: filtered.reduce((a, c) => a + (c.prix_achat || 0) * (c.quantite || 1), 0),
    val: filtered.reduce((a, c) => a + (c.valeur_loose || 0) * (c.quantite || 1), 0),
  }), [filtered])

  async function handleSave(form) {
    const payload = { ...form, user_id: userId }
    if (editing) {
      await supabase.from('cartes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('cartes').insert(payload)
    }
    setModal(false); setEditing(null); onRefresh()
  }

  async function handleDelete(id) {
    await supabase.from('cartes').delete().eq('id', id)
    setDeleting(null); onRefresh()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Cartes Singles</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {filtered.length} cartes · PA {formatEur(totaux.pa)} · Valeur {formatEur(totaux.val)}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setModal(true) }}>+ Ajouter</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <select value={filterRarete} onChange={e => setFilterRarete(e.target.value)} style={{ width: 150 }}>
          <option value="">Toutes raretés</option>
          {RARETE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 160 }}>
          <option value="valeur_desc">Tri : Valeur ↓</option>
          <option value="pnl_desc">Tri : P&L ↓</option>
          <option value="serie">Tri : Série A-Z</option>
          <option value="recent">Tri : Récents</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Qté</th>
                <th>Pokémon</th>
                <th>Série</th>
                <th>Rareté</th>
                <th>Numéro</th>
                <th style={{ textAlign: 'right' }}>P.A. unit.</th>
                <th style={{ textAlign: 'right' }}>Valeur unit.</th>
                <th style={{ textAlign: 'right' }}>Total valeur</th>
                <th style={{ textAlign: 'right' }}>P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const total = (c.valeur_loose || 0) * (c.quantite || 1)
                const pa = (c.prix_achat || 0) * (c.quantite || 1)
                const pnl = pctChange(c.valeur_loose || 0, c.prix_achat || 0)
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-bright)', fontSize: 14 }}>{c.quantite || 1}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.pokemon || '—'}</td>
                    <td><span className="tag" style={{ borderColor: 'rgba(139,92,246,0.3)', color: 'var(--accent-bright)', fontSize: 10 }}>{c.serie}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.rarete}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero}</td>
                    <td style={{ textAlign: 'right' }}>{formatEur(c.prix_achat || 0)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{formatEur(c.valeur_loose || 0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{formatEur(total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {c.prix_achat > 0 && pnl != null ? (
                        <span className={`badge ${pnl >= 0 ? 'badge-up' : 'badge-down'}`}>{formatPct(pnl)}</span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => { setEditing(c); setModal(true) }}>✏</button>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => setDeleting(c.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Aucune carte. Cliquez sur "+ Ajouter" pour commencer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete */}
      {deleting && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <h3 style={{ marginBottom: 8 }}>Supprimer cette carte ?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleting)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <ItemModal show={modal} onClose={() => { setModal(false); setEditing(null) }}
        onSave={handleSave} fields={FIELDS}
        title={editing ? 'Modifier la carte' : 'Ajouter une carte'}
        initialData={editing} />
    </div>
  )
}
