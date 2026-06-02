import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatEur } from '../lib/api'

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'cartes', label: 'Cartes Loose' },
  { id: 'scelles', label: 'Scellés' },
  { id: 'gradees', label: 'Gradées' },
  { id: 'settings', label: 'Paramètres' },
]

export default function Topbar({ active, onNav, totalPatrimoine, isAdmin, theme, onToggleTheme, hidden, onToggleHidden, user, onSignOut }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
  const initials = (form.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()

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
      if (!error) { const { data } = supabase.storage.from('pokevault').getPublicUrl(path); avatarUrl = data.publicUrl }
      setUploadingAvatar(false)
    }
    await supabase.auth.updateUser({ data: { ...form, avatar_url: avatarUrl } })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function navigate(id) { onNav(id); setMobileOpen(false) }

  const allNav = [...NAV, ...(isAdmin ? [{ id: 'admin', label: '🛠 Admin' }] : [])]

  return (
    <>
      {/* ── TOPBAR ─────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        height: 'var(--topbar-height)', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0,
      }}>
        {/* Logo — typo uniquement, sans carré */}
        <button onClick={() => navigate('dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 16px 0 0', display: 'flex', alignItems: 'baseline', gap: 2,
          borderRight: '1px solid var(--border)', marginRight: 16, flexShrink: 0
        }}>
          <span style={{ fontWeight: 300, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>Poké</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-bright)', letterSpacing: '0.3px' }}>Vault</span>
          <span style={{ fontWeight: 200, fontSize: 13, color: 'var(--text-muted)', marginLeft: 2 }}>X</span>
        </button>

        {/* Nav desktop */}
        <nav className="desktop-nav" style={{ alignItems: 'center', gap: 2, flex: 1 }}>
          {allNav.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
              background: active === item.id ? 'var(--accent-dim)' : 'transparent',
              color: active === item.id ? 'var(--accent-bright)' : item.id === 'admin' ? 'var(--neon-amber)' : 'var(--text-secondary)',
              fontWeight: active === item.id ? 600 : 400,
              borderBottom: active === item.id ? `2px solid ${item.id === 'admin' ? 'var(--neon-amber)' : 'var(--accent)'}` : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
            }}>{item.label}</button>
          ))}
        </nav>

        {/* Patrimoine desktop */}
        <div className="desktop-nav" style={{ padding: '0 16px', borderLeft: '1px solid var(--border)', marginLeft: 8, flexShrink: 0, flexDirection: 'column', gap: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Patrimoine</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-bright)', filter: hidden ? 'blur(7px)' : 'none', transition: 'filter 0.2s', userSelect: hidden ? 'none' : 'auto' }}>
            {formatEur(totalPatrimoine)}
          </div>
        </div>

        {/* Actions droite */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          <button onClick={onToggleHidden} title={hidden ? 'Afficher' : 'Masquer'} style={{
            background: hidden ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${hidden ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '5px 10px', fontSize: 15, cursor: 'pointer',
            color: hidden ? 'var(--accent-bright)' : 'var(--text-muted)',
          }}>{hidden ? '👁' : '👁‍🗨'}</button>

          <button onClick={onToggleTheme} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px', fontSize: 15, cursor: 'pointer', color: 'var(--text-secondary)',
          }}>{theme === 'dark' ? '☀️' : '🌙'}</button>

          {/* Avatar */}
          <button onClick={() => setAccountOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '4px 10px 4px 5px', cursor: 'pointer',
          }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarPreview ? 'transparent' : 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarPreview(null)} /> : initials}
            </div>
            <span className="desktop-nav" style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.firstName || user?.email?.split('@')[0]}
            </span>
          </button>

          {/* Burger mobile */}
          <button onClick={() => setMobileOpen(o => !o)} className="mobile-only" style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px', fontSize: 17, cursor: 'pointer', color: 'var(--text-secondary)',
          }}>☰</button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 'var(--topbar-height)', left: 0, right: 0,
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          zIndex: 190, padding: '10px 14px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {/* Patrimoine mobile */}
          <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Patrimoine total</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-bright)', filter: hidden ? 'blur(7px)' : 'none' }}>{formatEur(totalPatrimoine)}</div>
          </div>

          {/* Nav items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {allNav.map(item => (
              <button key={item.id} onClick={() => navigate(item.id)} style={{
                padding: '12px 14px', border: `1px solid ${active === item.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, cursor: 'pointer', fontSize: 13, textAlign: 'left',
                background: active === item.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: active === item.id ? 'var(--accent-bright)' : item.id === 'admin' ? 'var(--neon-amber)' : 'var(--text-secondary)',
                fontWeight: active === item.id ? 600 : 400,
              }}>{item.label}</button>
            ))}
          </div>

          {/* Actions mobile */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onToggleHidden} style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {hidden ? '👁 Afficher' : '👁‍🗨 Masquer'}
            </button>
            <button onClick={onToggleTheme} style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? '☀️ Jour' : '🌙 Nuit'}
            </button>
            <button onClick={() => { setMobileOpen(false); setAccountOpen(true) }} style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              👤 Compte
            </button>
          </div>
        </div>
      )}

      {/* Panel compte */}
      {accountOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAccountOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Mon compte</h2>
              <button onClick={() => setAccountOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: 14, background: 'var(--bg-elevated)', borderRadius: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', border: '3px solid var(--border)' }}>
                  {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarPreview(null)} /> : initials}
                </div>
                <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', color: '#fff' }}>✏</button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : user?.email}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Prénom</label><input value={form.firstName} placeholder="Valentin" onChange={e => set('firstName', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Nom</label><input value={form.lastName} placeholder="Dupont" onChange={e => set('lastName', e.target.value)} /></div>
              </div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Email</label><input value={user?.email || ''} disabled style={{ opacity: 0.6 }} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Téléphone</label><input type="tel" placeholder="+33 6 00 00 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Adresse</label><textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} style={{ resize: 'none' }} /></div>
              <button className="btn-primary" onClick={handleSave} disabled={saving || uploadingAvatar} style={{ width: '100%', padding: '10px' }}>{saved ? '✅ Sauvegardé !' : saving ? '⟳...' : 'Sauvegarder'}</button>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['dark', '🌙 Nuit'], ['light', '☀️ Jour']].map(([t, label]) => (
                    <button key={t} onClick={onToggleTheme} style={{ flex: 1, padding: '8px', border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, background: theme === t ? 'var(--accent-dim)' : 'transparent', color: theme === t ? 'var(--accent-bright)' : 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
              </div>
              <button className="btn-danger" onClick={() => { onSignOut(); setAccountOpen(false) }} style={{ width: '100%', padding: '10px' }}>Déconnexion</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
