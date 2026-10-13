import { notFound } from 'next/navigation'
import { adminSb } from '@/lib/supabase'
import BookingWizard from '@/components/BookingWizard'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function Page({ params }: { params: { slug: string } }) {
  const sb = adminSb()
  const { data: est, error } = await sb.from('establishments').select('*').eq('slug', params.slug).maybeSingle()
  if (error) return <p style={{ padding: 24 }}>Erro ao consultar o banco: {error.message}</p>
  if (!est) notFound()
  const [{ data: services }, { data: pros }] = await Promise.all([
    sb.from('services').select('*').eq('establishment_id', est.id).order('name'),
    sb.from('professionals').select('*').eq('establishment_id', est.id).order('name'),
  ])
  return <BookingWizard est={est} services={services ?? []} pros={pros ?? []} />
}
