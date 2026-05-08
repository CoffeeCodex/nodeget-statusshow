import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')
const latency = readFileSync(new URL('../src/utils/latency.ts', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../src/hooks/useMainLatency.ts', import.meta.url), 'utf8')
const methods = readFileSync(new URL('../src/api/methods.ts', import.meta.url), 'utf8')

const checks = [
  [nodeCard.includes('在线状态'), 'availability panel title is 在线状态'],
  [!nodeCard.includes('24h 在线'), '24h label is removed'],
  [nodeCard.includes('Array.from({ length: 40 }'), 'availability fallback uses 40 slots'],
  [nodeCard.includes('repeat(40,minmax(0,1fr))'), 'availability strip renders 40 slots'],
  [latency.includes('slotCount = 40'), 'agent history uses 40 slots'],
  [latency.includes('slotMs = 3 * 60 * 1000'), 'agent history uses 3 minute slots'],
  [hook.includes('computeAgentHistory(node.history, node.online)'), 'availability comes from node.history'],
  [!hook.includes('dynamicMonitoringSummary'), 'hook no longer fetches dynamic_monitoring_summary'],
  [!methods.includes('dynamic_monitoring_summary'), 'API no longer calls dynamic_monitoring_summary'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('session availability checks passed')
