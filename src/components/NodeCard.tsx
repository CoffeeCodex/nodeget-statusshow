import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import { Flag } from './Flag'
import { StatusDot } from './StatusDot'
import { bytes, pct, uptime } from '../utils/format'
import { cpuLabel, deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { cn } from '../utils/cn'
import type { Node } from '../types'
import type { LatencyStats, OnlineHistory } from '../utils/latency'

interface Props {
  node: Node
  tcpStats?: LatencyStats[]
  onlineHistory?: OnlineHistory
}

export function NodeCard({ node, tcpStats = [], onlineHistory }: Props) {
  const u = deriveUsage(node)
  const os = osLabel(node)
  const logo = distroLogo(node)
  const virt = virtLabel(node)
  const cpu = cpuLabel(node)

  return (
    <a href={`#${encodeURIComponent(node.uuid)}`} className="block group">
      <article
        className={cn(
          'rounded-[20px] border border-white/[0.075] bg-[#10131a] p-[18px] shadow-[0_20px_70px_rgba(0,0,0,0.38)] transition duration-200',
          'bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))]',
          'hover:border-sky-300/25 hover:-translate-y-0.5',
          node.online ? 'hover:shadow-[0_22px_78px_rgba(0,0,0,0.42)]' : 'opacity-70',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-white/[0.075] bg-[#0a0d13]">
            {logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" loading="lazy" /> : <StatusDot online={node.online} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[18px] font-[760] tracking-[-0.03em]" title={displayName(node)}>
              {displayName(node)}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-400">{virt || '—'}</div>
          </div>
          <Flag code={node.meta?.region} className="h-4 w-6 shrink-0 rounded-[2px]" />
        </div>

        <div className="mt-[15px] rounded-[14px] border border-white/[0.075] bg-black/15 p-3 text-[13px] leading-snug text-slate-200">
          <div className="truncate">{os || 'Unknown system'}</div>
          <div className="mt-1 truncate text-slate-400" title={cpu || undefined}>{cpu || 'Unknown CPU'}</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-[9px]">
          <UsageBlock label="CPU" value={u.cpu} hot />
          <UsageBlock label="MEM" value={u.mem} />
          <UsageBlock label="DISK" value={u.disk} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <NetBox dir="down" value={`${bytes(u.netIn || 0)}/s`} />
          <NetBox dir="up" value={`${bytes(u.netOut || 0)}/s`} />
        </div>

        <TcpBlock stats={tcpStats} />

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>24h 在线</span>
            <span className="font-mono text-slate-200">
              {onlineHistory?.percent == null ? '—' : `${onlineHistory.percent.toFixed(0)}%`}
            </span>
          </div>
          <HistoryStrip onlineHistory={onlineHistory} />
        </div>

        <div className="mt-3.5 flex items-center gap-2.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3" />
            {uptime(u.uptime)}
          </span>
          <span className={cn('ml-auto text-[11px] font-black tracking-[0.11em]', node.online ? 'text-emerald-400' : 'text-rose-400')}>
            {node.online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </article>
    </a>
  )
}

function UsageBlock({ label, value, hot }: { label: string; value?: number; hot?: boolean }) {
  const safe = value != null && Number.isFinite(value) ? value : null
  const capped = Math.max(0, Math.min(100, safe ?? 0))
  const filled = safe == null ? 0 : Math.ceil(capped / 5)
  return (
    <div className="min-w-0 rounded-[14px] border border-white/[0.075] bg-white/[0.025] p-2.5">
      <div className="mb-2 flex items-baseline justify-between gap-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className={cn('font-mono text-[13px] font-bold', hot && safe != null && safe >= 90 ? 'text-rose-400' : 'text-cyan-300')}>
          {pct(safe)}
        </span>
      </div>
      <div className="grid h-[18px] grid-cols-[repeat(20,minmax(0,1fr))] gap-0.5 overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'rounded-[2px] bg-white/[0.065]',
              i < filled && (hot && safe != null && safe >= 90 ? 'bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500' : 'bg-gradient-to-b from-cyan-300 to-cyan-700'),
            )}
          />
        ))}
      </div>
    </div>
  )
}

function NetBox({ dir, value }: { dir: 'down' | 'up'; value: string }) {
  const Icon = dir === 'down' ? ArrowDown : ArrowUp
  return (
    <div className="rounded-[14px] border border-white/[0.075] bg-white/[0.024] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
        <Icon className="h-3 w-3" />
        {dir === 'down' ? 'DOWN' : 'UP'}
      </div>
      <div className="mt-1 font-mono text-[17px] font-bold">{value}</div>
    </div>
  )
}

function TcpBlock({ stats }: { stats: LatencyStats[] }) {
  const rows = stats.length ? stats : []
  return (
    <div className="mt-3 rounded-2xl border border-white/[0.075] bg-black/15 p-[13px]">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-[0.1em] text-blue-100">TCPing</div>
        <div className="text-[10px] font-black tracking-[0.13em] text-emerald-400">LIVE</div>
      </div>
      {rows.length ? (
        rows.map(row => <TcpRow key={row.name} stat={row} />)
      ) : (
        <div className="py-2 text-xs text-slate-500">暂无 TCPing 数据</div>
      )}
    </div>
  )
}

function TcpRow({ stat }: { stat: LatencyStats }) {
  const latest = stat.latest ?? stat.avg
  const tone = latencyTone(latest)
  return (
    <div className="my-2 grid grid-cols-[38px_1fr_56px_32px] items-center gap-2">
      <div className="truncate text-xs font-semibold text-slate-300" title={stat.name}>{stat.name}</div>
      <div className="grid h-4 grid-cols-[repeat(100,minmax(0,1fr))] gap-px overflow-hidden">
        {Array.from({ length: 100 }, (_, i) => {
          const offset = Math.max(0, 100 - stat.probes.length)
          const value = i < offset ? null : stat.probes[i - offset]
          return <span key={i} className={cn('rounded-[1px] bg-white/[0.055]', value != null && tcpProbeClass(value))} />
        })}
      </div>
      <div className={cn('text-right font-mono text-[13px] font-extrabold', tone)}>
        {latest == null ? '—' : `${latest.toFixed(0)}ms`}
      </div>
      <div className="text-right font-mono text-[11px] font-bold text-slate-400">{stat.lossRate.toFixed(0)}%</div>
    </div>
  )
}

function tcpProbeClass(v: number) {
  if (v <= 80) return 'bg-gradient-to-b from-green-300 to-green-600'
  if (v <= 180) return 'bg-gradient-to-b from-yellow-300 to-orange-500'
  return 'bg-gradient-to-b from-rose-300 to-red-600'
}

function latencyTone(v: number | null) {
  if (v == null) return 'text-slate-500'
  if (v <= 80) return 'text-emerald-400'
  if (v <= 180) return 'text-orange-400'
  return 'text-rose-400'
}

function HistoryStrip({ onlineHistory }: { onlineHistory?: OnlineHistory }) {
  const slots = onlineHistory?.slots ?? Array.from({ length: 96 }, () => false)
  return (
    <div className="grid h-[17px] grid-cols-[repeat(96,minmax(0,1fr))] gap-px overflow-hidden">
      {slots.map((online, i) => (
        <span
          key={i}
          className={cn(
            'rounded-[1px] bg-white/[0.06]',
            online && 'bg-gradient-to-b from-green-300 to-green-600',
          )}
        />
      ))}
    </div>
  )
}
