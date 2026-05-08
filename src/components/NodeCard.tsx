import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import { Flag } from './Flag'
import { StatusDot } from './StatusDot'
import { bytes, pct, uptime } from '../utils/format'
import { deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { hasCost, remainingDays } from '../utils/cost'
import { cn } from '../utils/cn'
import type { Node, NodeMeta } from '../types'
import type { AgentHistory, LatencyStats } from '../utils/latency'

interface Props {
  node: Node
  tcpStats?: LatencyStats[]
  agentHistory?: AgentHistory
}

export function NodeCard({ node, tcpStats = [], agentHistory }: Props) {
  const u = deriveUsage(node)
  const os = osLabel(node)
  const logo = distroLogo(node)
  const virt = virtLabel(node)
  const specs = nodeSpecs(node, u)

  return (
    <a href={`#${encodeURIComponent(node.uuid)}`} className="block group">
      <article
        className={cn(
          'rounded-[20px] border border-border bg-card p-[18px] shadow-[0_20px_54px_rgba(15,23,42,0.11)] transition duration-200',
          'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]',
          'dark:border-white/[0.075] dark:bg-[#10131a] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] dark:shadow-[0_20px_70px_rgba(0,0,0,0.38)]',
          'hover:border-sky-500/25 hover:-translate-y-0.5 dark:hover:border-sky-300/25',
          node.online ? 'hover:shadow-[0_22px_62px_rgba(15,23,42,0.14)] dark:hover:shadow-[0_22px_78px_rgba(0,0,0,0.42)]' : 'opacity-70',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-border bg-muted/70 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/[0.075] dark:bg-[#0a0d13] dark:text-cyan-300 dark:shadow-none">
            {logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" loading="lazy" /> : <StatusDot online={node.online} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[18px] font-[760] tracking-[-0.03em]" title={displayName(node)}>
              {displayName(node)}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-muted-foreground dark:text-slate-400">{virt || '—'}</div>
          </div>
          <Flag code={node.meta?.region} className="h-4 w-6 shrink-0 rounded-[2px]" />
        </div>

        <div className="mt-[15px] rounded-[14px] border border-border bg-accent/70 p-3 text-[13px] leading-snug text-foreground/80 dark:border-white/[0.075] dark:bg-black/15 dark:text-slate-200">
          <div className="truncate">{os || 'Unknown system'}</div>
          {specs.cpuDetail && (
            <div className="mt-1 truncate font-mono text-[11px] font-semibold text-muted-foreground dark:text-slate-500" title={specs.cpuDetail}>
              CPU {specs.cpuDetail}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-[9px]">
          <UsagePie label="CPU" spec={specs.cpu} value={u.cpu} hot />
          <UsagePie label="MEM" spec={specs.mem} value={u.mem} />
          <UsagePie label="DISK" spec={specs.disk} value={u.disk} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <NetBox dir="down" value={`${bytes(u.netIn || 0)}/s`} />
          <NetBox dir="up" value={`${bytes(u.netOut || 0)}/s`} />
        </div>

        <TcpBlock stats={tcpStats} />

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
            <span>在线状态</span>
            <span className="font-mono text-foreground dark:text-slate-200">
              {agentHistory?.percent == null ? '—' : `${agentHistory.percent.toFixed(0)}%`}
            </span>
          </div>
          <AgentHistoryStrip agentHistory={agentHistory} />
        </div>

        {hasCost(node.meta) && <CostLine meta={node.meta} />}

        <div className="mt-3.5 flex items-center gap-2.5 text-xs text-muted-foreground dark:text-slate-400">
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3" />
            {formatUptimeCn(u.uptime)}
          </span>
          <span className={cn('ml-auto text-[11px] font-black tracking-[0.11em]', node.online ? 'text-emerald-400' : 'text-rose-400')}>
            {node.online ? '在线' : '离线'}
          </span>
        </div>
      </article>
    </a>
  )
}


function formatUptimeCn(value?: number) {
  const text = uptime(value)
  if (text === '—') return '运行时间 —'
  return `运行 ${text.replace(/d/g, ' 天').replace(/h/g, ' 小时').replace(/m/g, ' 分钟').replace(/s/g, ' 秒')}`
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

function UsagePie({ label, spec, value, hot }: { label: string; spec?: string; value?: number; hot?: boolean }) {
  const safe = value != null && Number.isFinite(value) ? value : null
  const capped = Math.max(0, Math.min(100, safe ?? 0))
  const tone = pieTone(safe)
  return (
    <div className="min-w-0 rounded-[14px] border border-border bg-muted/45 p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/[0.075] dark:bg-white/[0.025] dark:shadow-none">
      <div
        className={cn(
          'relative mx-auto grid h-[58px] w-[58px] place-items-center rounded-full [background:conic-gradient(var(--pie)_calc(var(--p)*1%),rgba(148,163,184,0.18)_0)]',
          tone,
        )}
        style={{ '--p': capped } as React.CSSProperties}
        title={spec ? `${label} ${spec}` : label}
      >
        <span className="absolute inset-[9px] rounded-full bg-card shadow-[0_0_0_1px_hsl(var(--border)/0.55)] dark:bg-[#10131a]" />
        <span className="relative z-10 font-mono text-[13px] font-extrabold text-foreground dark:text-slate-100">{pct(safe)}</span>
      </div>
      <div className="mt-1.5 truncate text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:text-slate-400">
        {label}
      </div>
      {spec && <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-muted-foreground dark:text-slate-500">{spec}</div>}
    </div>
  )
}

function pieTone(value: number | null) {
  if (value == null) return '[--pie:theme(colors.slate.500)] text-slate-500'
  if (value >= 90) return '[--pie:theme(colors.rose.400)] text-rose-400'
  if (value >= 70) return '[--pie:theme(colors.orange.400)] text-orange-400'
  return '[--pie:theme(colors.cyan.300)] text-cyan-300'
}

function UsageBlock({ label, spec, value, hot }: { label: string; spec?: string; value?: number; hot?: boolean }) {
  const safe = value != null && Number.isFinite(value) ? value : null
  const capped = Math.max(0, Math.min(100, safe ?? 0))
  const filled = safe == null ? 0 : Math.ceil(capped / 5)
  return (
    <div className="min-w-0 rounded-[14px] border border-border bg-muted/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/[0.075] dark:bg-white/[0.025] dark:shadow-none">
      <div className="mb-2 flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:text-slate-400" title={spec ? `${label} ${spec}` : label}>
          {label}
          {spec && <span className="ml-1 font-mono text-[10px] normal-case tracking-normal text-muted-foreground dark:text-slate-500">({spec})</span>}
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
              'rounded-[2px] bg-slate-200 dark:bg-white/[0.065]',
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
    <div className="rounded-[14px] border border-border bg-muted/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/[0.075] dark:bg-white/[0.024] dark:shadow-none">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:text-slate-400">
        <Icon className="h-3 w-3" />
        {dir === 'down' ? '下行' : '上行'}
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
    if (days < 0) daysText = '已过期'
    else if (days === 0) daysText = '今日到期'
    else daysText = `剩余 ${days} 天`
  }

  return (
    <div
      className={cn(
        'mt-2.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground dark:text-slate-400',
        days != null && days <= 7 && days >= 0 && '[&_.cost-days]:text-orange-400',
        days != null && days < 0 && '[&_.cost-days]:text-rose-400',
      )}
      title={meta.expireTime ? `expires ${meta.expireTime}` : undefined}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground dark:text-slate-400">费用</span>
      {price && <span className="font-mono font-extrabold text-blue-700 dark:text-blue-100">{price}</span>}
      {price && daysText && <span className="text-slate-300 dark:text-white/[0.22]">·</span>}
      {daysText && <span className="cost-days font-mono font-extrabold text-emerald-400">{daysText}</span>}
    </div>
  )
}

function TcpBlock({ stats }: { stats: LatencyStats[] }) {
  const rows = stats.length ? stats : []
  return (
    <div className="mt-3 rounded-2xl border border-border bg-accent/70 p-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/[0.075] dark:bg-black/15 dark:shadow-none">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-[0.1em] text-blue-700 dark:text-blue-100">三网延迟</div>
        <div className="text-[10px] font-black tracking-[0.13em] text-emerald-400">LIVE</div>
      </div>
      {rows.length ? (
        rows.map(row => <TcpRow key={row.name} stat={row} />)
      ) : (
        <div className="py-2 text-xs text-muted-foreground dark:text-slate-500">暂无三网延迟数据</div>
      )}
    </div>
  )
}

function TcpRow({ stat }: { stat: LatencyStats }) {
  const latest = stat.latest ?? stat.avg
  const tone = latencyTone(latest)
  return (
    <div className="my-2 grid grid-cols-[72px_1fr_56px_32px] items-center gap-2">
      <div className="truncate text-xs font-semibold text-foreground/75 dark:text-slate-300" title={tcpDisplayName(stat.name)}>
        {tcpDisplayName(stat.name)}
      </div>
      <TcpSparkline probes={stat.probes} />
      <div className={cn('text-right font-mono text-[13px] font-extrabold', tone)}>
        {latest == null ? '—' : `${latest.toFixed(0)}ms`}
      </div>
      <div className="text-right font-mono text-[11px] font-bold text-muted-foreground dark:text-slate-400">{stat.lossRate.toFixed(0)}%</div>
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
    return <div className="h-[26px] rounded-[2px] bg-muted dark:bg-white/[0.045]" />
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
      <line x1="0" y1="20" x2={width} y2="20" className="stroke-border dark:stroke-white/[0.075]" strokeWidth="1" />
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

function AgentHistoryStrip({ agentHistory }: { agentHistory?: AgentHistory }) {
  const slots = agentHistory?.slots ?? Array.from({ length: 40 }, () => ({ active: false as const, t: null as number | null }))
  return (
    <div className="grid h-5 grid-cols-[repeat(40,minmax(0,1fr))] items-stretch gap-[2px] overflow-hidden">
      {slots.map((slot, i) => (
        <span
          key={i}
          title={agentTitle(slot)}
          className={cn(
            'rounded-[2px] bg-slate-200 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.035)] dark:bg-white/[0.07] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
            slot.active && 'bg-gradient-to-b from-green-300 to-green-600 shadow-[0_0_10px_rgba(52,211,153,0.12)]',
          )}
        />
      ))}
    </div>
  )
}

function agentTitle(slot: AgentHistory['slots'][number]) {
  const t = slot.t ?? slot.start ?? slot.end
  return t == null ? 'no data' : new Date(t).toLocaleString(undefined, { hour12: false })
}
