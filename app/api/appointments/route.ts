import { NextRequest, NextResponse } from 'next/server'
import { adminSb } from '@/lib/supabase'
import { getAvailableSlots, getSlotsForAny } from '@/lib/slots'

const TAKEN = 'Esse horário acabou de ser ocupado. Escolha outro.'

export async function POST(req: NextRequest) {
  const { establishmentId, professionalId, serviceId, name, phone, date, time } = await req.json()
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!establishmentId || !professionalId || !serviceId || !name?.trim() || digits.length < 10 || !date || !time)
    return NextResponse.json({ error: 'Preencha nome e WhatsApp com DDD.' }, { status: 400 })
  const sb = adminSb()
  const { data: s } = await sb.from('services').select('duration_minutes').eq('id', serviceId).single()
  if (!s) return NextResponse.json({ error: 'Serviço inválido' }, { status: 400 })

  // Revalida no servidor: o horário ainda está livre?
  let proId: string | undefined = professionalId
  if (proId === 'any')
    proId = (await getSlotsForAny(sb, establishmentId, date, s.duration_minutes)).find((x) => x.time === time)?.professionalId
  else if (!(await getAvailableSlots(sb, proId!, date, s.duration_minutes)).includes(time)) proId = undefined
  if (!proId) return NextResponse.json({ error: TAKEN }, { status: 409 })

  const { data, error } = await sb.from('appointments').insert({
    establishment_id: establishmentId, professional_id: proId, service_id: serviceId,
    client_name: name.trim(), client_phone: digits, date, time, status: 'pending',
  }).select('*, professionals(name)').single()
  if (error) return NextResponse.json({ error: TAKEN }, { status: 409 })
  return NextResponse.json({ appointment: data })
}
