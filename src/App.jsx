import React, { useState, useEffect, useMemo } from 'react'
import { supabase, getSession, signOut } from './lib/supabase'
import { useCollection } from './lib/useCollection'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cartes from './pages/Cartes'
import Scelles from './pages/Scelles'
import Gradees from './pages/Gradees'
import AdminCatalog from './pages/AdminCatalog'
import Settings from './pages/Settings'

const ADMIN_EMAIL = 'pristinevaultsas@gmail.com'

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [authLoading, setAuthLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('pv_theme') || 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pv_theme', theme)
  }, [theme])

  useEffect(() => {
    getSession().then(s => { setSession(s); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const isAdmin = session?.user?.email === ADMIN_EMAIL
  const { cartes, scelles, gradees, boosters, priceHistory, loading, refresh } = useCollection(userId)

  const totalPatrimoine = useMemo(() => [
    ...cartes.map(c => (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1)),
    ...scelles.map(s => (s.resell || s.retail || s.prix_achat || 0) * (s.quantite || 1)),
    ...gradees.map(g => g.valeur || g.prix_achat || 0),
    ...boosters.map(b => b.valeur_loose || b.prix_achat || 0),
  ].reduce((a, b) => a + b, 0), [cartes, scelles, gradees, boosters])

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent-bright)' }}>Chargement…</div>
    </div>
  )

  if (!session) return <Login onLogin={setSession} />

  const allScelles = [...scelles, ...boosters]
  function navigate(p) { setPage(p); setSidebarOpen(false) }

  const PAGES = {
    dashboard: <Dashboard
      cartes={cartes} scelles={allScelles} gradees={gradees}
      boosters={boosters} priceHistory={priceHistory} hidden={hidden}
    />,
    cartes: <Cartes cartes={cartes} userId={userId} onRefresh={refresh} hidden={hidden} />,
    scelles: <Scelles scelles={allScelles} userId={userId} onRefresh={refresh} hidden={hidden} />,
    gradees: <Gradees gradees={gradees} userId={userId} onRefresh={refresh} hidden={hidden} />,
    admin: <AdminCatalog user={session.user} />,
    settings: <Settings user={session.user} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150 }} />
      )}
      <Sidebar
        active={page} onNav={navigate} totalPatrimoine={totalPatrimoine}
        isAdmin={isAdmin} isOpen={sidebarOpen} hidden={hidden}
      />
      <Header
        user={session.user} theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onSignOut={signOut}
        onMenuToggle={() => setSidebarOpen(o => !o)}
        hidden={hidden}
        onToggleHidden={() => setHidden(h => !h)}
      />
      <main className="main-content" style={{
        marginLeft: 220, flex: 1, padding: '28px 32px',
        paddingTop: 'calc(var(--header-height) + 28px)',
        minHeight: '100vh', background: 'var(--bg-primary)'
      }}>
        {loading
          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Chargement…</div>
          : (PAGES[page] || PAGES.dashboard)}
      </main>
    </div>
  )
}
