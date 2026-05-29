import React, { useState, useEffect } from 'react'

export default function ItemModal({ show, onClose, onSave, fields, title, initialData }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    if (show) {
      const defaults = {}
      fields.forEach(f => { defaults[f.key] = initialData?.[f.key] ?? f.default ?? '' })
      setForm(defaults)
    }
  }, [show, initialData])

  if (!show) return null

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 20, border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
                {f.label}
              </label>
              {f.type === 'select' ? (
                <select value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                  <option value="">— Choisir —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={3} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key] ?? ''}
                  placeholder={f.placeholder || ''}
                  step={f.step}
                  onChange={e => set(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)}>
            {initialData ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
