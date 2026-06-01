import React from 'react'
import { formatEur } from '../lib/api'

const NAV = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'cartes', icon: '🃏', label: 'Cartes Loose' },
  { id: 'scelles', icon: '📦', label: 'Scellés' },
  { id: 'gradees', icon: '🏆', label: 'Gradées' },
  { id: 'settings', icon: '⚙', label: 'Paramètres' },
]

export default function Sidebar({ active, onNav, totalPatrimoine, isAdmin, isOpen, hidden }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} style={{
      width: 220, minWidth: 220, background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '0', position: 'fixed',
      left: 0, top: 0, bottom: 0, zIndex: 160, overflowY: 'auto'
    }}>
      {/* Logo PokéVault X */}
      <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => onNav('dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo SVG minimaliste */}
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="34" height="34" rx="8" fill="url(#grad)" />
              <text x="17" y="23" textAnchor="middle" fontFamily="Inter, system-ui" fontSize="15" fontWeight="300" fill="white" letterSpacing="0">PV</text>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>Poké</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent-bright)', letterSpacing: '0.5px' }}>Vault</span>
                <span style={{ fontWeight: 200, fontSize: 13, color: 'var(--text-muted)', marginLeft: 1 }}>X</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1 }}>Portfolio TCG</div>
            </div>
          </div>
        </button>
      </div>

      {/* Patrimoine */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Patrimoine total</div>
        <div style={{
          fontSize: 20, fontWeight: 700, color: 'var(--accent-bright)',
          filter: hidden ? 'blur(8px)' : 'none', transition: 'filter 0.2s',
          userSelect: hidden ? 'none' : 'auto'
        }}>{formatEur(totalPatrimoine)}</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
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
              <span style={{ fontSize: 15 }}>🛠</span>Catalogue Admin
            </button>
          </>
        )}
      </nav>
    </aside>
  )
}
