import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Auth helpers ────────────────────────────────────────────
export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password })
}
export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password })
}
export async function signOut() {
  return await supabase.auth.signOut()
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
