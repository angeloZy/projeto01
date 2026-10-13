'use client'
import { useCallback, useEffect, useState } from 'react'
import { Check, X, Plus, Trash2, LogOut } from 'lucide-react'
import { browserSb } from '@/lib/supabase'

const sb = browserSb()
const DOW = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const iso = (d: Date) => d.toLocaleDateString('sv-SE')
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Concluído' }

export default function Admin() {
  const [user, setUser] = useState<any>(null); const [ready, setReady] = useState(false)
  const [email, setEmail] = useState(''); const [pass, setPass] = useState(''); const [err, setErr] = useState('')
  const [est, setEst] = useState<any>(null)
  const [tab, setTab] = useState<'agenda' | 'servicos' | 'horarios'>('agenda')
  const [view, setView] = useState<'day' | 'week'>('day'); const [date, setDate] = useState(iso(new Date()))
  const [appts, setAppts] = useState<any[]>([]); const [svcs, setSvcs] = useState<any[]>([]); const [pros, setPros] = useState<any[]>([])
  const [proId, setProId] = useState(''); const [rows, setRows] = useState<any[]>([])
  const [man, setMan] = useState<any>(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true) })
    const { data } = sb.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (user) sb.from('establishments').select('*').eq('owner_id', user.id).maybeSingle().then(({ data }) => setEst(data)) }, [user])

  const load = useCallback(async () => {
    if (!est) return
    const d = new Date(date + 'T12:00:00'); let from = date, to = date
    if (view === 'week') { const m = new Date(d); m.setDate(d.getDate() - d.getDay()); const e = new Date(m); e.setDate(m.getDate() + 6); from = iso(m); to = iso(e) }
    const [a, s, p] = await Promise.all([
      sb.from('appointments').select('*, services(name,price,duration_minutes), professionals(name)').eq('establishment_id', est.id).gte('date', from).lte('date', to).order('date').order('time'),
      sb.from('services').select('*').eq('establishment_id', est.id).order('name'),
      sb.from('professionals').select('*').eq('establishment_id', est.id).order('name')])
    setAppts(a.data ?? []); setSvcs(s.data ?? []); setPros(p.data ?? []); if (!proId && p.data?.[0]) setProId(p.data[0].id)
  }, [est, date, view, proId])
  useEffect(() => { load() }, [load])
  useEffect(() => { // tempo real: novo agendamento aparece sozinho
    if (!est) return
    const ch = sb.channel('appts').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [est, load])
  useEffect(() => { if (proId) sb.from('availability').select('*').eq('professional_id', proId).then(({ data }) =>
    setRows(DOW.map((_, i) => { const r = data?.find((x) => x.day_of_week === i)
      return { day: i, on: !!r, start: r?.start_time.slice(0, 5) ?? '08:00', end: r?.end_time.slice(0, 5) ?? '18:00',
        ls: r?.lunch_start?.slice(0, 5) ?? '12:00', le: r?.lunch_end?.slice(0, 5) ?? '13:00' } }))) }, [proId])

  const setStatus = async (id: string, status: string) => { await sb.from('appointments').update({ status }).eq('id', id); load() }
  async function addManual() {
    const { error } = await sb.from('appointments').insert({ establishment_id: est.id, professional_id: man.pro, service_id: man.svc,
      client_name: man.name, client_phone: man.phone || '0000000000', date, time: man.time, status: 'confirmed' })
    if (error) return alert('Horário já ocupado ou dados incompletos.'); setMan(null); load()
  }
  async function saveHours() {
    await sb.from('availability').delete().eq('professional_id', proId)
    await sb.from('availability').insert(rows.filter((r) => r.on).map((r) => ({ professional_id: proId, day_of_week: r.day,
      start_time: r.start, end_time: r.end, lunch_start: r.ls || null, lunch_end: r.le || null }))); alert('Horários salvos.')
  }
  async function patchSvc(id: string, f: any) { await sb.from('services').update(f).eq('id', id); load() }

  if (!ready) return null
  if (!user) return (
    <main className="mx-auto max-w-sm space-y-3 p-6 pt-24">
      <h1 className="text-3xl font-extrabold">Entrar no painel</h1>
      <input className="inp" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="inp" placeholder="Senha" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
      {err && <p className="text-sm text-pole">{err}</p>}
      <button className="btn w-full" onClick={async () => { const { error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) setErr('E-mail ou senha incorretos.') }}>Entrar</button>
    </main>)
  if (!est) return <p className="p-6">Nenhum estabelecimento vinculado a este usuário. Veja o README (passo 3).</p>

  const link = typeof window !== 'undefined' ? `${location.origin}/${est.slug}` : ''
  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="flex items-center justify-between py-3">
        <div><h1 className="text-2xl font-extrabold">{est.name}</h1><p className="text-sm text-steel">Link para clientes: {link}</p></div>
        <button aria-label="Sair" onClick={() => sb.auth.signOut()}><LogOut /></button>
      </header>
      <nav className="mb-4 flex gap-2">{(['agenda', 'servicos', 'horarios'] as const).map((t) =>
        <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 font-semibold ${tab === t ? 'bg-ink text-white' : 'bg-white'}`}>{{ agenda: 'Agenda', servicos: 'Serviços', horarios: 'Horários' }[t]}</button>)}</nav>

      {tab === 'agenda' && <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="inp w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          {(['day', 'week'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-xl px-3 py-2 ${view === v ? 'bg-ink text-white' : 'bg-white'}`}>{v === 'day' ? 'Dia' : 'Semana'}</button>)}
          <button className="btn ml-auto flex items-center gap-1 !py-2" onClick={() => setMan({ pro: pros[0]?.id, svc: svcs[0]?.id, name: '', phone: '', time: '09:00' })}><Plus size={16} />Cliente de balcão</button>
        </div>
        {man && <div className="card grid gap-2 sm:grid-cols-2">
          <input className="inp" placeholder="Nome" value={man.name} onChange={(e) => setMan({ ...man, name: e.target.value })} />
          <input className="inp" placeholder="WhatsApp (opcional)" value={man.phone} onChange={(e) => setMan({ ...man, phone: e.target.value })} />
          <select className="inp" value={man.svc} onChange={(e) => setMan({ ...man, svc: e.target.value })}>{svcs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select className="inp" value={man.pro} onChange={(e) => setMan({ ...man, pro: e.target.value })}>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input type="time" className="inp" value={man.time} onChange={(e) => setMan({ ...man, time: e.target.value })} />
          <button className="btn" onClick={addManual}>Adicionar em {date.split('-').reverse().join('/')}</button></div>}
        {appts.length === 0 && <p className="py-10 text-center text-steel">Nenhum agendamento neste período.</p>}
        {appts.map((a) => (
          <div key={a.id} className={`card flex items-center gap-3 ${a.status === 'cancelled' ? 'opacity-50' : ''}`}>
            <div className="w-16 text-center"><b className="text-lg">{a.time.slice(0, 5)}</b>{view === 'week' && <p className="text-xs text-steel">{a.date.slice(8)}/{a.date.slice(5, 7)}</p>}</div>
            <div className="flex-1"><p className="font-semibold">{a.client_name} <span className="text-xs font-normal text-steel">· {STATUS[a.status]}</span></p>
              <p className="text-sm text-steel">{a.services?.name} · {brl(a.services?.price)} · {a.professionals?.name}</p></div>
            <a className="text-sm underline" href={`https://wa.me/55${a.client_phone.replace(/^55/, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
            {a.status !== 'cancelled' && a.status !== 'completed' && <>
              <button aria-label="Concluir" onClick={() => setStatus(a.id, 'completed')} className="rounded-lg bg-ink p-2 text-white"><Check size={16} /></button>
              <button aria-label="Cancelar" onClick={() => setStatus(a.id, 'cancelled')} className="rounded-lg bg-pole p-2 text-white"><X size={16} /></button></>}
          </div>))}
      </section>}

      {tab === 'servicos' && <section className="space-y-2">
        {svcs.map((s) => <div key={s.id} className="card grid grid-cols-[1fr_70px_90px_auto] items-center gap-2">
          <input className="inp" defaultValue={s.name} onBlur={(e) => patchSvc(s.id, { name: e.target.value })} />
          <input className="inp" type="number" defaultValue={s.duration_minutes} onBlur={(e) => patchSvc(s.id, { duration_minutes: +e.target.value })} aria-label="Minutos" />
          <input className="inp" type="number" step="0.01" defaultValue={s.price} onBlur={(e) => patchSvc(s.id, { price: +e.target.value })} aria-label="Preço" />
          <button aria-label="Excluir" onClick={async () => { if (confirm('Excluir serviço?')) { await sb.from('services').delete().eq('id', s.id); load() } }}><Trash2 size={18} /></button></div>)}
        <button className="btn flex items-center gap-1" onClick={async () => { await sb.from('services').insert({ establishment_id: est.id, name: 'Novo serviço', duration_minutes: 30, price: 40 }); load() }}><Plus size={16} />Novo serviço</button>
        <p className="text-xs text-steel">Colunas: nome · minutos · preço (R$). Salva ao sair do campo.</p>
      </section>}

      {tab === 'horarios' && <section className="space-y-2">
        <select className="inp" value={proId} onChange={(e) => setProId(e.target.value)}>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {rows.map((r, i) => { const up = (f: any) => setRows(rows.map((x, j) => j === i ? { ...x, ...f } : x))
          return <div key={r.day} className="card flex flex-wrap items-center gap-2">
            <label className="flex w-28 items-center gap-2 font-semibold"><input type="checkbox" checked={r.on} onChange={(e) => up({ on: e.target.checked })} />{DOW[r.day]}</label>
            {r.on ? <>{(['start', 'end', 'ls', 'le'] as const).map((k, n) => <span key={k} className="flex items-center gap-1 text-xs text-steel">{['das', 'às', 'almoço', 'até'][n]}
              <input type="time" className="inp !w-28 !py-1" value={r[k]} onChange={(e) => up({ [k]: e.target.value })} /></span>)}</> : <span className="text-steel">Folga</span>}
          </div> })}
        <button className="btn" onClick={saveHours}>Salvar horários</button>
      </section>}
    </main>)
}
