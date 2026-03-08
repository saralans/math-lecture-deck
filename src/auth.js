import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google' })
}

export function signInWithGitHub() {
  return supabase.auth.signInWithOAuth({ provider: 'github' })
}

export function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session)
  })
  return () => subscription.unsubscribe()
}
