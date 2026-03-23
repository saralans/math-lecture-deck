import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { flowType: 'implicit', detectSessionInUrl: false } },
)

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export function signInWithGitHub() {
  return supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin },
  })
}

export function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// After OAuth redirect, #access_token=... is in the URL hash.
// Supabase processes it async — this explicitly sets the session
// from those tokens so we don't depend on event timing.
export async function processOAuthHash() {
  const hash = window.location.hash
  if (!hash.includes('access_token=')) return null
  const params = new URLSearchParams(hash.substring(1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) throw error
  return data.session
}

export function onAuthChange(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session)
  })
  return () => subscription.unsubscribe()
}
