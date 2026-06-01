import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Header({ user, theme, onToggleTheme, onSignOut, onMenuToggle, hidden, onToggleHidden }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [form, setForm] = useState({
    phone: user?.user_metadata?.phone || '',
    firstName: user?.user_metadata?.firstName || '',
    lastName: user?.user_metadata?.lastName || '',
    address: user?.user_metadata?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleAvatarChange(e) {
    const file = e.target.files[0]; if (!file) return
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    let avatarUrl = user?.user_metadata?.avatar_url || null
    if (avatarFile) {
      setUploadingAvatar(true)
      const ext = avatarFile.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error } = await supabase.storage.from('pokevault').upload(path, avatarFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('pokevault').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
      setUploadingAvatar(false)
    }
    await supabase.auth.updateUser({ data: { ...form, avatar_url: avatarUrl } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (form.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()

  return (
    <>
      <div className="header-bar" style={{
        position: 'fixed', top: 0, right: 0, left: 220,
        height: 'var(--header-height)', background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', gap: 8, zIndex: 90
      }}>
        {/* Burger mobile */}
        <button className="mobile-menu-btn" onClick={onMenuToggle} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px', fontSize: 18,
          color: 'var(--text-secondary)', cursor: 'pointer', display: 'none'
        }}>☰</button>

        <div style={{ flex: 1 }} />

        {/* Bouton masquer les montants — à côté du toggle thème */}
        <button onClick={onToggleHidden} title={hidden ? 'Afficher les montants' : 'Masquer les montants'} style={{
          background: hidden ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          border: `1px solid ${hidden ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '6px 12px', fontSize: 16, cursor: 'pointer',
          color: hidden ? 'var(--accent-bright)' : 'var(--text-muted)',
          transition: 'all 0.2s'
        }}>{hidden ? '👁' : '👁‍🗨'}</button>

        {/* Toggle thème */}
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
          borderRadius: 8, padding: '5px 12px 5px 6px', cursor: 'pointer'
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: avatarPreview ? 'transparent' : 'var(--accent)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {avatarPreview
              ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarPreview(null)} />
              : initials}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {form.firstName || user?.email?.split('@')[0]}
          </span>
        </button>
      </div>

      {/* Panel compte */}
      {accountOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAccountOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Mon compte</h2>
              <button onClick={() => setAccountOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', border: '3px solid var(--border)' }}>
                  {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarPreview(null)} /> : initials}
                </div>
                <button onClick={() => fileRef.current?.click()} style={{
                  position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--accent)', border: '2px solid var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, cursor: 'pointer', color: '#fff'
                }}>✏</button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : user?.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prénom</label>
                  <input value={form.firstName} placeholder="Valentin" onChange={e => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Nom</label>
                  <input value={form.lastName} placeholder="Dupont" onChange={e => set('lastName', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Email</label>
                <input value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Téléphone</label>
                <input type="tel" placeholder="+33 6 00 00 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Adresse</label>
                <textarea rows={2} placeholder="1 rue de la Paix, 75001 Paris" value={form.address} onChange={e => set('address', e.target.value)} style={{ resize: 'none' }} />
              </div>

              <button className="btn-primary" onClick={handleSave} disabled={saving || uploadingAvatar} style={{ width: '100%', padding: '10px' }}>
                {saved ? '✅ Sauvegardé !' : saving || uploadingAvatar ? '⟳ Sauvegarde...' : 'Sauvegarder'}
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

              <button className="btn-danger" onClick={() => { onSignOut(); setAccountOpen(false) }} style={{ width: '100%', padding: '10px' }}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
