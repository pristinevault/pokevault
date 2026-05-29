import React, { useState, useEffect, useMemo } from 'react'
import { supabase, getSession, signOut } from './lib/supabase'
import { useCollection } from './lib/useCollection'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cartes from './pages/Cartes'
import Scelles from './pages/Scelles'
import Gradees from './pages/Gradees'
import Boosters from './pages/Boosters'
import PricesLive from './pages/PricesLive'
import Settings from './pages/Settings'

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => { setSession(s); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const { cartes, scelles, gradees, boosters, priceHistory, loading, refresh } = useCollection(userId)

  const totalPatrimoine = useMemo(() => {
    return [
      ...cartes.map(c => (c.valeur_loose || c.prix_achat || 0) * (c.quantite || 1)),
      ...scelles.map(s => (s.resell || s.retail || s.prix_achat || 0) * (s.quantite || 1)),
      ...gradees.map(g => g.valeur || g.prix_achat || 0),
      ...boosters.map(b => b.valeur_loose || b.prix_achat || 0),
    ].reduce((a, b) => a + b, 0)
  }, [cartes, scelles, gradees, boosters])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-bright)', fontSize: 14 }}>Chargement…</div>
      </div>
    )
  }

  if (!session) return <Login onLogin={setSession} />

  const PAGES = {
    dashboard: <Dashboard cartes={cartes} scelles={scelles} gradees={gradees} boosters={boosters} priceHistory={priceHistory} />,
    cartes: <Cartes cartes={cartes} userId={userId} onRefresh={refresh} />,
    scelles: <Scelles scelles={scelles} userId={userId} onRefresh={refresh} />,
    gradees: <Gradees gradees={gradees} userId={userId} onRefresh={refresh} />,
    boosters: <Boosters boosters={boosters} userId={userId} onRefresh={refresh} />,
    prices: <PricesLive cartes={cartes} userId={userId} onRefresh={refresh} />,
    settings: <Settings user={session.user} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={page}
        onNav={setPage}
        totalPatrimoine={totalPatrimoine}
        onSignOut={signOut}
      />
      <main style={{
        marginLeft: 220, flex: 1, padding: '28px 32px',
        minHeight: '100vh', background: 'var(--bg-primary)'
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            Chargement de la collection…
          </div>
        ) : (
          PAGES[page] || PAGES.dashboard
        )}
      </main>
    </div>
  )
}
