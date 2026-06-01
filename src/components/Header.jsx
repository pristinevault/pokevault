import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Header({ user, theme, onToggleTheme, onSignOut }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSavePhone() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { phone } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, left: 220,
        height: 52, background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 28px', gap: 10, zIndex: 90
      }}>
        {/* Toggle theme */}
        <button onClick={onToggleTheme} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', fontSize: 16,
          color: 'var(--text-secondary)', cursor: 'pointer'
        }} title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Compte */}
        <button onClick={() => setAccountOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer'
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff'
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </span>
        </button>
      </div>

      {/* Panel compte */}
      {accountOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAccountOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Mon compte</h2>
              <button onClick={() => setAccountOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Compte PokéVault</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Email</label>
                <input value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Téléphone</label>
                <input
                  type="tel" placeholder="+33 6 00 00 00 00"
                  value={phone || user?.user_metadata?.phone || ''}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <button className="btn-primary" onClick={handleSavePhone} disabled={saving} style={{ width: '100%', padding: '10px' }}>
                {saved ? '✅ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Thème</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['dark', '🌙 Nuit'], ['light', '☀️ Jour']].map(([t, label]) => (
                    <button key={t} onClick={onToggleTheme} style={{
                      flex: 1, padding: '8px', border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8, background: theme === t ? 'var(--accent-dim)' : 'transparent',
                      color: theme === t ? 'var(--accent-bright)' : 'var(--text-muted)',
                      fontSize: 13, cursor: 'pointer'
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              <button className="btn-danger" onClick={() => { onSignOut(); setAccountOpen(false) }} style={{ width: '100%', padding: '10px', marginTop: 4 }}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
