// ─── Correspondance codes série → IDs TCGdex ─────────────────
export const SERIE_MAP = {
  SV1FR: 'sv1', SVPFR: 'svp', SSVPFR: 'svp',
  SCRFR: 'sv2', OBFFR: 'sv3', PARFR: 'sv3a',
  PAFFR: 'sv3pt5', PALFR: 'sv4', PREFR: 'sv4pt5',
  TEFFR: 'sv5', SSPFR: 'sv6', WHTFR: 'sv6pt5',
  BLKFR: 'sv6pt5', DRIFR: 'sv7', TWMFR: 'sv7pt5',
  JTGFR: 'sv8', SFAFR: 'sv8pt5', MEWFR: 'mew',
  SV9: 'sv9',
  ZENITH: 'swsh12pt5', 'ASTRES RADIEUX': 'swsh10',
  'ORIGINE PERDUE': 'swsh11', 'ORIGNE PERDUE': 'swsh11',
  'ORGINE PERDUE': 'swsh11', 'TEMPETE ARGENTE': 'swsh12',
  'STARS ETINCELANTES': 'swsh9', 'LA VOIX DU MAITRE': 'swsh7',
  'CIEL RUGISSANT': 'sm7', 'MAJESTÉ DES DRAGONS': 'sm7a',
  'DESTINEE OCULTES': 'sm3p', 'ALLIANCE INFAILLIBLE': 'sm10',
  'CELEBRATION': 'cel25', DR: 'swsh7',
  SM8B: 'sm8b', 'N&B': 'bw11',
  ME01: 'sv8', ME02: 'sv8',
}

// ─── Fetch prix TCGdex (CardMarket EU, gratuit, sans clé) ────
export async function fetchTCGdexPrice(serie, numero) {
  const prefix = SERIE_MAP[serie?.toUpperCase()]
  if (!prefix || !numero) return null
  const cardNum = String(numero).split('/')[0].replace(/^0+/, '')
  const cardId = `${prefix}-${cardNum}`
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/cards/${cardId}`)
    if (!res.ok) return null
    const data = await res.json()
    const cm = data?.pricing?.cardmarket
    if (!cm) return null
    return {
      source: 'tcgdex',
      cardId,
      trend: cm.trend ?? null,
      avg: cm.avg ?? null,
      low: cm.low ?? null,
      avg7: cm.avg7 ?? null,
      avg30: cm.avg30 ?? null,
      updated: cm.updated ?? null,
    }
  } catch { return null }
}

// ─── Fetch prix PokeTrace (CardMarket EU + eBay, clé requise) ─
export async function fetchPokeTracePrice(cardmarketId) {
  const key = import.meta.env.VITE_POKETRACE_KEY
  if (!key || !cardmarketId) return null
  try {
    const res = await fetch(
      `https://api.poketrace.com/v1/cards/${cardmarketId}?market=EU`,
      { headers: { Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const cm = data?.prices?.cardmarket_unsold?.NEAR_MINT
    return {
      source: 'poketrace',
      nmAvg: cm?.avg ?? null,
      nmLow: cm?.low ?? null,
      nmHigh: cm?.high ?? null,
    }
  } catch { return null }
}

// ─── Prix combiné (TCGdex en priorité, PokeTrace en fallback) ─
export async function getCardPrice(serie, numero, cardmarketId) {
  const tcgdex = await fetchTCGdexPrice(serie, numero)
  if (tcgdex?.trend) return tcgdex
  if (cardmarketId) {
    const pt = await fetchPokeTracePrice(cardmarketId)
    if (pt?.nmAvg) return { source: 'poketrace', trend: pt.nmAvg, ...pt }
  }
  return tcgdex
}

// ─── Formatters ──────────────────────────────────────────────
export function formatEur(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(val))
}

export function formatPct(val) {
  if (val == null) return '—'
  const n = Number(val)
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

export function pctChange(current, purchase) {
  if (!purchase || purchase === 0) return null
  return ((current - purchase) / purchase) * 100
}

export function annualReturn(purchase, current, purchaseDate) {
  if (!purchase || purchase === 0 || !purchaseDate) return null
  const years = (Date.now() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 0.01) return null
  return (Math.pow(current / purchase, 1 / years) - 1) * 100
}
