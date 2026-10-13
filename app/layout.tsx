import './globals.css'
import { Bricolage_Grotesque } from 'next/font/google'
const f = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font' })
export const metadata = { title: 'Agende seu horário' }
export const viewport = { width: 'device-width', initialScale: 1 }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className={f.variable + ' font-sans'}>{children}</body></html>
}
