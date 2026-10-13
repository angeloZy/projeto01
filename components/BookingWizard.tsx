'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, Clock, MessageCircle, CalendarPlus, Check, Users } from 'lucide-react'

type Svc = { id: string; name: string; description?: string; duration_minutes: number; price: number }
type Pro = { id: string; name: string; avatar_url?: string; bio?: string }
type Slot = { time: string; professionalId: string }
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const iso = (d: Date) => d.toLocaleDateString('sv-SE')
const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })
const br = (s: string) => s.split('-').reverse().join('/')
const TITLES = ['Qual serviço?', 'Com quem?', 'Quando?', 'Seus dados', 'Agendado!']

export default function BookingWizard({ est, services, pros }: { est: any; services: Svc[]; pros: Pro[] }) {
  const [step, setStep] = useState(1)
  const [svc, setSvc] = useState<Svc>()
  const [pro, setPro] = useState<string>()
  const [date, setDate] = useState(iso(new Date()))
  const [slots, setSlots] = useState<Slot[]>([])
  const [slot, setSlot] = useState<Slot>()
  const [name, setName] = useState(''); const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState<any>()

  useEffect(() => {
    if (step !== 3 || !svc || !pro) return
    setSlot(undefined); setBusy(true)
    fetch(`/api/slots?establishmentId=${est.id}&professionalId=${pro}&serviceId=${svc.id}&date=${date}`)
      .then((r) => r.json()).then((d) => setSlots(d.slots ?? [])).finally(() => setBusy(false))
  }, [step, date, pro, svc, est.id])

  async function confirm() {
    setBusy(true); setErr('')
    const r = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ establishmentId: est.id, professionalId: slot!.professionalId === pro ? pro : slot!.professionalId,
        serviceId: svc!.id, name, phone, date, time: slot!.time }) })
    const d = await r.json(); setBusy(false)
    if (!r.ok) { setErr(d.error); if (r.status === 409) setStep(3); return }
    setDone(d.appointment); setStep(5)
  }

  const proName = done?.professionals?.name ?? ''
  const msg = `Olá! Sou ${name}. Agendei ${svc?.name} para ${br(date)} às ${slot?.time}${proName ? ' com ' + proName : ''}.`
  const wa = `https://wa.me/${est.whatsapp}?text=${encodeURIComponent(msg)}`
  function ics() {
    const f = (t: string, add = 0) => { const [h, m] = t.split(':').map(Number); const x = h * 60 + m + add
      return `${date.replace(/-/g, '')}T${String(Math.floor(x / 60)).padStart(2, '0')}${String(x % 60).padStart(2, '0')}00` }
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${f(slot!.time)}`,
      `DTEND:${f(slot!.time, svc!.duration_minutes)}`, `SUMMARY:${svc!.name} - ${est.name}`, `LOCATION:${est.address ?? ''}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    return 'data:text/calendar;charset=utf8,' + encodeURIComponent(body)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10">
      <div className="pole -mx-4 h-2" aria-hidden />
      <header className="flex items-center gap-2 py-5">
        {step > 1 && step < 5 && <button aria-label="Voltar" onClick={() => setStep(step - 1)} className="-ml-2 p-2"><ChevronLeft /></button>}
        <div><p className="text-sm text-steel">{est.name}</p><h1 className="text-2xl font-extrabold tracking-tight">{TITLES[step - 1]}</h1></div>
      </header>
      {err && <p role="alert" className="mb-3 rounded-xl bg-pole/10 p-3 text-sm text-pole">{err}</p>}

      {step === 1 && <div className="space-y-2">
        {services.length === 0 && <p className="text-steel">Nenhum serviço cadastrado ainda.</p>}
        {services.map((s) => (
          <button key={s.id} className="card w-full hover:border-ink" onClick={() => { setSvc(s); setStep(2) }}>
            <div className="flex justify-between font-semibold"><span>{s.name}</span><span>{brl(s.price)}</span></div>
            <p className="mt-1 flex items-center gap-1 text-sm text-steel"><Clock size={14} />{s.duration_minutes} min{s.description && ` · ${s.description}`}</p>
          </button>))}
      </div>}

      {step === 2 && <div className="space-y-2">
        <button className="card flex w-full items-center gap-3 hover:border-ink" onClick={() => { setPro('any'); setStep(3) }}>
          <Users className="text-steel" /><span className="font-semibold">Qualquer profissional disponível</span></button>
        {pros.map((p) => (
          <button key={p.id} className="card flex w-full items-center gap-3 hover:border-ink" onClick={() => { setPro(p.id); setStep(3) }}>
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              : <span className="grid h-12 w-12 place-items-center rounded-full bg-ink font-bold text-white">{p.name[0]}</span>}
            <span><span className="block font-semibold">{p.name}</span><span className="text-sm text-steel">{p.bio}</span></span>
          </button>))}
      </div>}

      {step === 3 && <>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3" role="listbox" aria-label="Datas">
          {days.map((d) => { const v = iso(d), on = v === date
            return <button key={v} onClick={() => setDate(v)} aria-selected={on}
              className={`w-16 shrink-0 rounded-xl border py-2 text-center ${on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>
              <span className="block text-xs">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
              <span className="block text-xl font-bold">{d.getDate()}</span>
              <span className="block text-xs opacity-60">{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></button> })}
        </div>
        {busy ? <p className="py-8 text-center text-steel">Buscando horários…</p>
          : slots.length === 0 ? <p className="py-8 text-center text-steel">Sem horários livres neste dia. Tente outra data.</p>
          : <div className="grid grid-cols-4 gap-2">{slots.map((s) => (
            <button key={s.time} onClick={() => setSlot(s)}
              className={`rounded-xl border py-3 font-semibold ${slot?.time === s.time ? 'border-pole bg-pole text-white' : 'border-ink/15 bg-white'}`}>{s.time}</button>))}</div>}
        <button className="btn mt-6 w-full" disabled={!slot} onClick={() => setStep(4)}>Continuar</button>
      </>}

      {step === 4 && <div className="space-y-3">
        <p className="card text-sm">{svc!.name} · {brl(svc!.price)}<br />{br(date)} às {slot!.time}</p>
        <input className="inp" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input className="inp" placeholder="WhatsApp com DDD" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <button className="btn w-full" disabled={busy || !name.trim() || phone.replace(/\D/g, '').length < 10} onClick={confirm}>
          {busy ? 'Agendando…' : 'Confirmar agendamento'}</button>
      </div>}

      {step === 5 && <div className="space-y-3">
        <div className="card text-center"><span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-ink text-white"><Check /></span>
          <p className="font-bold">{svc!.name}{proName && ` com ${proName}`}</p>
          <p>{br(date)} às {slot!.time}</p>{est.address && <p className="mt-1 text-sm text-steel">{est.address}</p>}</div>
        <a className="btn flex w-full items-center justify-center gap-2" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={18} />Enviar confirmação pelo WhatsApp</a>
        <a className="card flex w-full items-center justify-center gap-2 font-semibold" href={ics()} download="agendamento.ics"><CalendarPlus size={18} />Salvar na agenda</a>
      </div>}
    </main>
  )
}
