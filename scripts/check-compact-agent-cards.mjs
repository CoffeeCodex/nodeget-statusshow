import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')
const latency = readFileSync(new URL('../src/utils/latency.ts', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../src/hooks/useMainLatency.ts', import.meta.url), 'utf8')

const checks = [
  [app.includes('xl:grid-cols-3'), 'cards view permits 3 columns on wide screens'],
  [nodeCard.includes('在线状态'), 'card title is 在线状态'],
  [nodeCard.includes('conic-gradient'), 'CPU/MEM/DISK render as pie charts'],
  [nodeCard.includes('title={agentTitle(slot)}'), 'availability tooltip is reduced to a localtime title'],
  [nodeCard.includes('toLocaleString'), 'availability title uses local time formatting'],
  [latency.includes('computeAgentHistory'), 'latency util computes agent communication history'],
  [!latency.includes('computeOnlineHistory(rows, type: LatencyType)'), 'old ping-derived online history helper was removed'],
  [latency.includes('slotCount = 40') && latency.includes('slotMs = 3 * 60 * 1000'), 'availability uses upstream-like session slots'],
  [hook.includes('node.history') && !hook.includes("{ type: 'ping' }") && !hook.includes('dynamicMonitoringSummary'), 'main latency hook uses node.history, not ping or monitoring-summary history'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('compact agent card checks passed')
