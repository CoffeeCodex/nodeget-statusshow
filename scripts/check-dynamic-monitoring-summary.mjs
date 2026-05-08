import { readFileSync } from 'node:fs'

const methods = readFileSync(new URL('../src/api/methods.ts', import.meta.url), 'utf8')
const useNodes = readFileSync(new URL('../src/hooks/useNodes.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8')

const checks = [
  [methods.includes('dynamicMonitoringSummary'), 'API method dynamicMonitoringSummary exists'],
  [methods.includes("'dynamic_monitoring_summary'"), 'RPC method dynamic_monitoring_summary is called'],
  [methods.includes('timestamp_from_to'), 'dynamic_monitoring_summary passes timestamp_from_to'],
  [useNodes.includes('dynamicMonitoringSummary'), 'useNodes fetches dynamic_monitoring_summary'],
  [useNodes.includes('HISTORY_WINDOW_MS'), 'useNodes defines 24h history window'],
  [useNodes.includes('setHistory(prev =>'), 'useNodes stores fetched history'],
  [types.includes('export type DynamicMonitoringSummary'), 'DynamicMonitoringSummary type exists'],
]

const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg)
if (failed.length) {
  console.error(failed.map(msg => `FAIL ${msg}`).join('\n'))
  process.exit(1)
}
console.log('dynamic monitoring summary checks passed')
