import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')
const latency = readFileSync(new URL('../src/utils/latency.ts', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../src/hooks/useMainLatency.ts', import.meta.url), 'utf8')
const methods = readFileSync(new URL('../src/api/methods.ts', import.meta.url), 'utf8')

const checks = [
  [nodeCard.includes('24h 在线'), 'availability title is 24h 在线'],
  [nodeCard.includes('repeat(24,minmax(0,1fr))'), 'availability strip renders 24 hourly slots'],
  [nodeCard.includes('ping 成功率'), 'tooltip/title indicates ping success rate'],
  [latency.includes('computePingAvailability'), 'ping availability helper exists'],
  [latency.includes('bucketCount = 24'), 'ping availability uses 24 buckets'],
  [hook.includes("{ type: 'ping' }"), 'main latency hook queries ping rows'],
  [hook.includes('computePingAvailability'), 'main latency hook computes ping availability'],
  [methods.includes('task_query'), 'task_query method remains available'],
  [!hook.includes('dynamicMonitoringSummary'), 'monitoring summary history is not used for availability'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('24h ping availability checks passed')
