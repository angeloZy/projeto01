import type { Config } from 'tailwindcss'
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { ink: '#14213D', paper: '#F5F6F8', pole: '#C8372D', steel: '#8A94A6' },
    fontFamily: { sans: ['var(--font)', 'system-ui', 'sans-serif'] } } },
} satisfies Config
