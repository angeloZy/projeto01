import { notFound } from 'next/navigation'
import { adminSb } from '@/lib/supabase'
import BookingWizard from '@/components/BookingWizard'
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: { slug: string } }) {
  const sb = adminSb()
  const { data: est } = await sb.from('establishments').select('*').eq('slug', params.slug).maybeSingle()
  if (!est) notFound()
  const [{ data: services }, { data: pros }] = await Promise.all([
    sb.from('services').select('*').eq('establishment_id', est.id).order('name'),
    sb.from('professionals').select('*').eq('establishment_id', est.id).order('name'),
  ])
  return <BookingWizard est={est} services={services ?? []} pros={pros ?? []} />
}
