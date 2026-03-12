import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const url = rawUrl?.trim()
const anonKey = rawAnonKey?.trim()

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Solo se usará el guardado local.',
  )
}

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null

