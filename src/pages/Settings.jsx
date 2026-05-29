import React from 'react'

export default function Settings({ user }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Paramètres</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Compte</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connecté en tant que : {user?.email}</div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Sources de données</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>TCGdex API</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CardMarket EU · Gratuit · Sans clé · Mise à jour quotidienne</div>
              </div>
              <span className="badge badge-up">Actif</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>PokeTrace API</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CardMarket + eBay + PSA · Clé requise (VITE_POKETRACE_KEY)</div>
              </div>
              <span className="badge badge-neutral">Optionnel</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Configuration .env</div>
          <pre style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '14px', fontSize: 12, color: 'var(--accent-bright)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8 }}>
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_POKETRACE_KEY=pk_live_xxx  # optionnel`}
          </pre>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Schéma Supabase requis</div>
          <pre style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '14px', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.7 }}>
{`-- Cartes singles
create table cartes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  quantite int default 1,
  pokemon text,
  serie text,
  rarete text,
  numero text,
  prix_achat numeric default 0,
  valeur_loose numeric default 0,
  date_achat date,
  notes text,
  cardmarket_id text,
  created_at timestamptz default now()
);

-- Scellés
create table scelles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  nom text,
  type_produit text,
  quantite int default 1,
  prix_achat numeric default 0,
  retail numeric default 0,
  resell numeric default 0,
  date_achat date,
  notes text,
  created_at timestamptz default now()
);

-- Gradées
create table gradees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  pokemon text,
  serie text,
  numero text,
  gradeur text,
  note text,
  prix_achat numeric default 0,
  valeur numeric default 0,
  loose numeric default 0,
  date_gradage date,
  notes text,
  created_at timestamptz default now()
);

-- Boosters art
create table boosters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  pokemon text,
  serie text,
  illustration text,
  langue text,
  prix_achat numeric default 0,
  valeur_loose numeric default 0,
  gradeur text,
  note text,
  top_hit text,
  date_achat date,
  notes text,
  created_at timestamptz default now()
);

-- Historique des prix (pour courbes)
create table price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  total_valeur numeric,
  recorded_at timestamptz default now()
);

-- Row Level Security (activer sur chaque table)
alter table cartes enable row level security;
create policy "user_own" on cartes using (auth.uid() = user_id);
-- (répéter pour scelles, gradees, boosters, price_history)`}
          </pre>
        </div>
      </div>
    </div>
  )
}
