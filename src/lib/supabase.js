import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwlmzqwixnoqryakbiwl.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bG16cXdpeG5vcXJ5YWtiaXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTM0NjUsImV4cCI6MjA5NTU4OTQ2NX0.PSfNZ-PeV5aVzCduAERY8mgwAMvKbq8XN6VVtl3FKFc'

export const supabase = createClient(supabaseUrl, supabaseKey)

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
