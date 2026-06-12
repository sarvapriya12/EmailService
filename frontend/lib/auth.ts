import { supabase } from './supabase'

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function logout() {
  await supabase.auth.signOut()
}
