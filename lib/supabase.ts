import { createClient, SupabaseClient } from '@supabase/supabase-js'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
let _b: SupabaseClient | null = null
export const browserSb = () => (_b ??= createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!))
// Somente servidor (rotas /api e Server Components). Nunca importe em componentes 'use client'.
export const adminSb = () =>
  createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
