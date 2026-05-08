import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')
const globalCss = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8')

const requiredNodeCardTokens = [
  'border-border bg-card',
  'dark:border-white/[0.075] dark:bg-[#10131a]',
  'bg-muted/70',
  'dark:bg-[#0a0d13]',
  'text-muted-foreground',
  'dark:text-slate-400',
  'bg-accent/70',
  'dark:bg-black/15',
  'stroke-border',
  'dark:stroke-white/[0.075]',
]

const forbiddenAlwaysDarkTokens = [
  'border border-white/[0.075] bg-[#10131a]',
  'border border-white/[0.075] bg-white/[0.025]',
  'border border-white/[0.075] bg-black/15',
  'className="stroke-white/[0.075]"',
]

const requiredGlobalTokens = [
  '--background: 220 33% 98%',
  '--card: 0 0% 100%',
  '.dark {',
  '.bg-soft',
]

const errors = []
for (const token of requiredNodeCardTokens) {
  if (!nodeCard.includes(token)) errors.push(`NodeCard missing token: ${token}`)
}
for (const token of forbiddenAlwaysDarkTokens) {
  if (nodeCard.includes(token)) errors.push(`NodeCard still has always-dark token: ${token}`)
}
for (const token of requiredGlobalTokens) {
  if (!globalCss.includes(token)) errors.push(`global.css missing token: ${token}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('light theme static checks passed')
