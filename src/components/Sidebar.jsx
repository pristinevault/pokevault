import React from 'react'
import { formatEur } from '../lib/api'

const NAV = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'cartes', icon: '🃏', label: 'Cartes Loose' },
  { id: 'scelles', icon: '📦', label: 'Scellés' },
  { id: 'gradees', icon: '🏆', label: 'Gradées' },
  { id: 'settings', icon: '⚙', label: 'Paramètres' },
]

export default function Sidebar({ active, onNav, totalPatrimoine, isAdmin, isOpen }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} style={{
      width: 220, minWidth: 220, background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '24px 0', position: 'fixed',
      left: 0, top: 0, bottom: 0, zIndex: 160, overflowY: 'auto'
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>PokéVault</div>
            <div style={{ fontSize: 10, color: 'var(--accent-bright)', textTransform: 'uppercase', letterSpacing: 1 }}>Portfolio TCG</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Patrimoine total</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-bright)' }}>{formatEur(totalPatrimoine)}</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            background: active === item.id ? 'var(--accent-dim)' : 'transparent',
            border: active === item.id ? '1px solid var(--border-hover)' : '1px solid transparent',
            color: active === item.id ? 'var(--accent-bright)' : 'var(--text-secondary)',
            fontWeight: active === item.id ? 500 : 400,
            fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
          </button>
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
            <button onClick={() => onNav('admin')} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: active === 'admin' ? 'rgba(245,158,11,0.1)' : 'transparent',
              border: active === 'admin' ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
              color: 'var(--neon-amber)', fontWeight: active === 'admin' ? 500 : 400,
              fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 16 }}>🛠</span>Catalogue Admin
            </button>
          </>
        )}
      </nav>
    </aside>
  )
}
