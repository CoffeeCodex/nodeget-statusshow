import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')
const derive = readFileSync(new URL('../src/utils/derive.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8')
const useNodes = readFileSync(new URL('../src/hooks/useNodes.ts', import.meta.url), 'utf8')

const checks = [
  [derive.includes('netInTotal: d?.total_received'), 'deriveUsage exposes total_received as netInTotal'],
  [derive.includes('netOutTotal: d?.total_transmitted'), 'deriveUsage exposes total_transmitted as netOutTotal'],
  [types.includes('netInTotal?: number') && types.includes('netOutTotal?: number'), 'Usage type includes traffic totals'],
  [useNodes.includes("'total_received'") && useNodes.includes("'total_transmitted'"), 'dynamic query requests traffic totals'],
  [nodeCard.includes('total={u.netInTotal}') && nodeCard.includes('total={u.netOutTotal}'), 'card passes traffic totals to net boxes'],
  [nodeCard.includes('累计 {bytes(total || 0)}'), 'net boxes render cumulative traffic'],
  [nodeCard.includes('累计接收流量') && nodeCard.includes('累计发送流量'), 'net boxes include directional total tooltips'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('traffic count card checks passed')
