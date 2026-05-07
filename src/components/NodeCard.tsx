import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import { Flag } from './Flag'
import { StatusDot } from './StatusDot'
import { bytes, pct, uptime } from '../utils/format'
import { deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { hasCost, remainingDays } from '../utils/cost'
import { cn } from '../utils/cn'
import type { Node, NodeMeta } from '../types'
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
  const specs = nodeSpecs(node, u)

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
          {specs.cpuDetail && (
            <div className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-500" title={specs.cpuDetail}>
              CPU {specs.cpuDetail}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-[9px]">
          <UsageBlock label="CPU" spec={specs.cpu} value={u.cpu} hot />
          <UsageBlock label="MEM" spec={specs.mem} value={u.mem} />
          <UsageBlock label="DISK" spec={specs.disk} value={u.disk} />
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

        {hasCost(node.meta) && <CostLine meta={node.meta} />}

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

function nodeSpecs(node: Node, usage: ReturnType<typeof deriveUsage>) {
  const cpu = node.static?.cpu
  const cores = cpu?.logical_cores ?? cpu?.physical_cores ?? cpu?.per_core?.length ?? null
  const cpuDetail = cpuDetailLabel(cpu, cores)
  return {
    cpu: cores ? `${cores} vCore${cores === 1 ? '' : 's'}` : undefined,
    cpuDetail,
    mem: usage.memTotal > 0 ? bytes(usage.memTotal) : undefined,
    disk: usage.diskTotal > 0 ? bytes(usage.diskTotal) : undefined,
  }
}

function cpuDetailLabel(cpu: Node['static']['cpu'] | undefined, cores: number | null) {
  if (!cpu) return cores ? `${cores} vCore${cores === 1 ? '' : 's'}` : undefined
  const brand = cleanCpuBrand(cpu.brand || cpu.per_core?.find(core => core.brand)?.brand)
  const frequency = cpu.per_core?.find(core => Number.isFinite(core.frequency) && core.frequency > 0)?.frequency
  const parts = [cores ? `${cores} vCore${cores === 1 ? '' : 's'}` : null, brand, formatCpuFrequency(frequency)].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

function cleanCpuBrand(brand?: string) {
  return brand
    ?.replace(/\s+/g, ' ')
    .replace(/\(R\)|\(TM\)/gi, '')
    .replace(/CPU\s+/i, '')
    .trim()
}

function formatCpuFrequency(frequency?: number) {
  if (!frequency || !Number.isFinite(frequency)) return undefined
  return frequency >= 1000 ? `@ ${(frequency / 1000).toFixed(2)}GHz` : `@ ${frequency.toFixed(0)}MHz`
}

function UsageBlock({ label, spec, value, hot }: { label: string; spec?: string; value?: number; hot?: boolean }) {
  const safe = value != null && Number.isFinite(value) ? value : null
  const capped = Math.max(0, Math.min(100, safe ?? 0))
  const filled = safe == null ? 0 : Math.ceil(capped / 5)
  return (
    <div className="min-w-0 rounded-[14px] border border-white/[0.075] bg-white/[0.025] p-2.5">
      <div className="mb-2 flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400" title={spec ? `${label} ${spec}` : label}>
          {label}
          {spec && <span className="ml-1 font-mono text-[10px] normal-case tracking-normal text-slate-500">({spec})</span>}
        </span>
        <span className={cn('shrink-0 font-mono text-[13px] font-bold', hot && safe != null && safe >= 90 ? 'text-rose-400' : 'text-cyan-300')}>
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

function CostLine({ meta }: { meta: NodeMeta }) {
  const unit = meta.priceUnit || '$'
  const days = remainingDays(meta.expireTime)
  const price = meta.price > 0 ? `${unit}${meta.price.toFixed(2)} / ${meta.priceCycle}d` : null
  let daysText: string | null = null
  if (days != null) {
    if (days < 0) daysText = 'expired'
    else if (days === 0) daysText = 'expires today'
    else daysText = `${days}d left`
  }

  return (
    <div
      className={cn(
        'mt-2.5 flex min-w-0 items-center gap-2 text-xs text-slate-400',
        days != null && days <= 7 && days >= 0 && '[&_.cost-days]:text-orange-400',
        days != null && days < 0 && '[&_.cost-days]:text-rose-400',
      )}
      title={meta.expireTime ? `expires ${meta.expireTime}` : undefined}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">COST</span>
      {price && <span className="font-mono font-extrabold text-blue-100">{price}</span>}
      {price && daysText && <span className="text-white/[0.22]">·</span>}
      {daysText && <span className="cost-days font-mono font-extrabold text-emerald-400">{daysText}</span>}
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
    <div className="my-2 grid grid-cols-[72px_1fr_56px_32px] items-center gap-2">
      <div className="truncate text-xs font-semibold text-slate-300" title={tcpDisplayName(stat.name)}>
        {tcpDisplayName(stat.name)}
      </div>
      <TcpSparkline probes={stat.probes} />
      <div className={cn('text-right font-mono text-[13px] font-extrabold', tone)}>
        {latest == null ? '—' : `${latest.toFixed(0)}ms`}
      </div>
      <div className="text-right font-mono text-[11px] font-bold text-slate-400">{stat.lossRate.toFixed(0)}%</div>
    </div>
  )
}

function TcpSparkline({ probes }: { probes: (number | null)[] }) {
  const width = 180
  const height = 26
  const offset = Math.max(0, 60 - probes.length)
  const values = Array.from({ length: 60 }, (_, i) => (i < offset ? null : probes[i - offset]))
  const numeric = values.filter((v): v is number => v != null)
  if (numeric.length < 2) {
    return <div className="h-[26px] rounded-[2px] bg-white/[0.045]" />
  }

  const min = Math.min(20, ...numeric)
  const max = Math.max(220, ...numeric)
  const points = values.map((v, i) => {
    if (v == null) return null
    const x = (i / (values.length - 1)) * width
    const y = height - 4 - ((v - min) / (max - min || 1)) * (height - 8)
    return { x, y, v }
  })

  const paths: { d: string; tone: string }[] = []
  let segment: NonNullable<(typeof points)[number]>[] = []
  const flush = () => {
    if (segment.length < 2) {
      segment = []
      return
    }
    const avg = segment.reduce((sum, p) => sum + p.v, 0) / segment.length
    paths.push({
      tone: latencyStroke(avg),
      d: segment.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
    })
    segment = []
  }

  points.forEach(point => {
    if (!point) flush()
    else segment.push(point)
  })
  flush()

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[26px] w-full overflow-visible">
      <line x1="0" y1="20" x2={width} y2="20" className="stroke-white/[0.075]" strokeWidth="1" />
      {values.map((v, i) => {
        if (v != null) return null
        const x = (i / (values.length - 1)) * width
        return <line key={i} x1={x} x2={x} y1="4" y2={height - 3} className="stroke-rose-400" strokeWidth="1.7" opacity="0.9" />
      })}
      {paths.map((path, i) => (
        <path key={i} d={path.d} className={path.tone} fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

function tcpDisplayName(name: string) {
  return name.replace(/^tcping[-_\s]*/i, '') || name
}

function latencyStroke(v: number) {
  if (v <= 80) return 'stroke-emerald-400'
  if (v <= 180) return 'stroke-orange-400'
  return 'stroke-rose-400'
}

function latencyTone(v: number | null) {
  if (v == null) return 'text-slate-500'
  if (v <= 80) return 'text-emerald-400'
  if (v <= 180) return 'text-orange-400'
  return 'text-rose-400'
}

function HistoryStrip({ onlineHistory }: { onlineHistory?: OnlineHistory }) {
  const hours = onlineHistory?.hours ?? Array.from({ length: 24 }, () => ({ ratio: null }))
  return (
    <div className="grid h-4 grid-cols-[repeat(24,minmax(0,1fr))] items-center gap-1 overflow-hidden">
      {hours.map((hour, i) => (
        <span
          key={i}
          title={hour.ratio == null ? `${i}:00 · no data` : `${i}:00 · ${hour.ratio.toFixed(0)}%`}
          className={cn(
            'h-2.5 rounded-full bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
            hour.ratio != null && hour.ratio >= 95 && 'bg-gradient-to-b from-green-300 to-green-600 shadow-[0_0_10px_rgba(52,211,153,0.12)]',
            hour.ratio != null && hour.ratio >= 70 && hour.ratio < 95 && 'bg-gradient-to-b from-yellow-300 to-orange-500 shadow-[0_0_10px_rgba(251,146,60,0.12)]',
            hour.ratio != null && hour.ratio < 70 && 'bg-gradient-to-b from-rose-300 to-red-600 shadow-[0_0_10px_rgba(251,113,133,0.12)]',
          )}
        />
      ))}
    </div>
  )
}
