import type { SupabaseClient } from '@supabase/supabase-js'

export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const toHHMM = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

type Block = { start: number; end: number }
const overlap = (a: Block, b: Block) => a.start < b.end && b.start < a.end

/** Função pura (fácil de testar): gera inícios livres a cada `step` min dentro do expediente. */
export function computeSlots(opts: {
  start: string; end: string; lunchStart?: string | null; lunchEnd?: string | null
  busy: Block[]; duration: number; step?: number; notBefore?: number
}): string[] {
  const { start, end, lunchStart, lunchEnd, busy, duration, step = 30, notBefore = 0 } = opts
  const blocks: Block[] = [...busy]
  if (lunchStart && lunchEnd) blocks.push({ start: toMin(lunchStart), end: toMin(lunchEnd) })
  const out: string[] = []
  for (let t = toMin(start); t + duration <= toMin(end); t += step) {
    if (t < notBefore) continue
    if (!blocks.some((b) => overlap({ start: t, end: t + duration }, b))) out.push(toHHMM(t))
  }
  return out
}

/** getAvailableSlots(professionalId, date): horários livres para a duração do serviço escolhido. */
export async function getAvailableSlots(
  sb: SupabaseClient, professionalId: string, date: string /* YYYY-MM-DD */, durationMinutes: number
): Promise<string[]> {
  const dow = new Date(`${date}T12:00:00`).getDay()
  const { data: rule } = await sb.from('availability').select('*')
    .eq('professional_id', professionalId).eq('day_of_week', dow).maybeSingle()
  if (!rule) return []                                   // dia de folga

  const { data: appts } = await sb.from('appointments')
    .select('time, services(duration_minutes)')
    .eq('professional_id', professionalId).eq('date', date).neq('status', 'cancelled')
  const busy = (appts ?? []).map((a: any) => {
    const s = toMin(a.time.slice(0, 5))
    return { start: s, end: s + (a.services?.duration_minutes ?? 30) }
  })

  // Se for hoje, não oferece horários que já passaram (fuso de Brasília/Maranhão)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const isToday = now.toLocaleDateString('sv-SE') === date
  return computeSlots({
    start: rule.start_time.slice(0, 5), end: rule.end_time.slice(0, 5),
    lunchStart: rule.lunch_start?.slice(0, 5), lunchEnd: rule.lunch_end?.slice(0, 5),
    busy, duration: durationMinutes, notBefore: isToday ? now.getHours() * 60 + now.getMinutes() + 15 : 0,
  })
}

/** Para "Qualquer profissional": une os horários e escolhe quem está livre. */
export async function getSlotsForAny(sb: SupabaseClient, establishmentId: string, date: string, duration: number) {
  const { data: pros } = await sb.from('professionals').select('id').eq('establishment_id', establishmentId)
  const map = new Map<string, string>()
  for (const p of pros ?? [])
    for (const t of await getAvailableSlots(sb, p.id, date, duration)) if (!map.has(t)) map.set(t, p.id)
  return [...map].map(([time, professionalId]) => ({ time, professionalId })).sort((a, b) => a.time.localeCompare(b.time))
}
