import { NextRequest, NextResponse } from 'next/server'
import { adminSb } from '@/lib/supabase'
import { getAvailableSlots, getSlotsForAny } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const [est, pro, date, svc] = ['establishmentId', 'professionalId', 'date', 'serviceId'].map((k) => q.get(k))
  if (!est || !pro || !date || !svc) return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 })
  const sb = adminSb()
  const { data: s } = await sb.from('services').select('duration_minutes').eq('id', svc).single()
  if (!s) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
  const slots = pro === 'any'
    ? await getSlotsForAny(sb, est, date, s.duration_minutes)
    : (await getAvailableSlots(sb, pro, date, s.duration_minutes)).map((time) => ({ time, professionalId: pro }))
  return NextResponse.json({ slots })
}
