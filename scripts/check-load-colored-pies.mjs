import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')

const checks = [
  [nodeCard.includes('pieTone(safe)'), 'UsagePie chooses color through pieTone'],
  [nodeCard.includes("if (value >= 90) return '[--pie:theme(colors.rose.400)] text-rose-400'"), '>=90 percent uses rose'],
  [nodeCard.includes("if (value >= 70) return '[--pie:theme(colors.orange.400)] text-orange-400'"), '70-89 percent uses orange'],
  [nodeCard.includes("return '[--pie:theme(colors.cyan.300)] text-cyan-300'"), '<70 percent uses cyan'],
  [nodeCard.includes('conic-gradient(var(--pie)'), 'pie chart still uses conic-gradient'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('load-colored pie checks passed')
