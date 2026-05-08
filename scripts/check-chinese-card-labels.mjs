import { readFileSync } from 'node:fs'

const nodeCard = readFileSync(new URL('../src/components/NodeCard.tsx', import.meta.url), 'utf8')

const required = ['下行', '上行', '三网延迟', '费用', '在线', '离线', '剩余', '已过期', '运行']
const forbidden = ['DOWN', 'UP', 'TCPing', 'COST', 'ONLINE', 'OFFLINE', 'd left', 'expired']

const failures = []
for (const token of required) {
  if (!nodeCard.includes(token)) failures.push(`missing Chinese label: ${token}`)
}
for (const token of forbidden) {
  if (nodeCard.includes(token)) failures.push(`still has English label: ${token}`)
}

if (failures.length) {
  console.error(failures.map(x => `FAIL ${x}`).join('\n'))
  process.exit(1)
}
console.log('Chinese card label checks passed')
