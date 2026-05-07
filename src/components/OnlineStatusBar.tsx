import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { cn } from '../utils/cn'
import { bytes, pct } from '../utils/format'
import type { HistorySample } from '../types'

interface OnlineStatusBarProps {
  history: HistorySample[]
  online: boolean
  compact?: boolean
  intervalMinutes?: number
  slots?: number
  title?: string
  mobileHalf?: boolean
  loading?: boolean
}

interface TimelineSlot {
  active: boolean
  start: number
  end: number
  sample: HistorySample | null
  reason: 'agent' | 'empty'
}

function hasResourceSignal(sample: HistorySample | null | undefined) {
  if (!sample) return false
  return (
    sample.cpu != null ||
    sample.mem != null ||
    sample.disk != null ||
    (sample.netIn ?? 0) > 0 ||
    (sample.netOut ?? 0) > 0
  )
}

export function OnlineStatusBar({
  history,
  online,
  compact = false,
  intervalMinutes = 3,
  slots = 80,
  title = '在线状态',
  mobileHalf = true,
  loading = false,
}: OnlineStatusBarProps) {
  const isMobile = useIsMobile()
  const effectiveSlots = mobileHalf && isMobile ? Math.max(1, Math.floor(slots / 2)) : slots
  const agentHistory = history || []
  const pending = loading && agentHistory.length === 0
  const timeline = useMemo(
    () => pending
      ? buildEmptyTimeline(intervalMinutes, effectiveSlots)
      : buildAgentTimeline(agentHistory, online, intervalMinutes, effectiveSlots),
    [agentHistory, online, intervalMinutes, effectiveSlots, pending],
  )
  const activeCount = timeline.filter(item => item.active).length
  const availability = timeline.length ? (activeCount / timeline.length) * 100 : 0
  const [hovered, setHovered] = useState<number | null>(null)
  const activeSlot = hovered != null ? timeline[hovered] : null
  const activeLeft = hovered != null ? `${((hovered + 0.5) / timeline.length) * 100}%` : '50%'

  return (
    <div
      className={cn(
        'rounded-md border border-dashed border-border bg-secondary/35',
        compact ? 'px-3 py-2.5' : 'px-5 py-4',
      )}
    >
      <div className={cn('flex items-center gap-2', compact ? 'text-[11px]' : 'text-sm')}>
        <span className="inline-flex items-center gap-1.5 font-bold text-primary">
          <Activity className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          {title}
        </span>
        <span className={cn('ml-auto font-black text-primary', compact ? 'text-[12px]' : 'text-base')}>
          {pending ? '…' : `${availability.toFixed(0)}%`}
        </span>
      </div>

      <div
        className="relative mt-2"
        aria-label={`Agent 通信在线率 ${pending ? '读取中' : `${availability.toFixed(0)}%`}`}
        onMouseLeave={() => setHovered(null)}
      >
        {activeSlot && !pending && <StatusTooltip compact={compact} slot={activeSlot} left={activeLeft} />}

        <div
          className={cn('grid items-stretch', compact ? 'gap-[3px]' : 'gap-1')}
          style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}
        >
          {timeline.map((slot, index) => (
            <span
              key={index}
              className={cn(
                'block cursor-default border border-transparent transition-colors duration-200',
                compact ? 'h-7 sm:h-7' : 'h-8 sm:h-8',
                slot.active
                  ? hasResourceSignal(slot.sample)
                    ? 'bg-primary shadow-[0_0_0_1px_rgba(66,185,131,0.09)]'
                    : 'bg-emerald-400/90 shadow-[0_0_0_1px_rgba(16,185,129,0.10)]'
                  : 'bg-border/90',
              )}
              style={{ borderRadius: 2 }}
              title={pending ? '读取 Agent 通信状态…' : buildTitle(slot)}
              onMouseEnter={() => setHovered(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusTooltip({ compact, slot, left }: { compact: boolean; slot: TimelineSlot; left: string }) {
  const s = slot.sample
  const timeLabel = formatTime(s?.t ?? slot.end)
  const hasMetrics = hasResourceSignal(s)
  const note = slot.active && !hasMetrics
    ? 'Agent 在该时间段与 Server 有通信，但没有可展示的资源采样。'
    : null

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full z-20 mb-3 -translate-x-1/2 rounded-sm border border-[hsl(var(--border))] bg-card px-3 py-2.5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-black/5',
        compact ? 'w-[190px] text-[10px]' : 'w-[220px] text-[11px]',
      )}
      style={{ left, backdropFilter: 'none', opacity: 1 }}
    >
      <div className="font-mono text-muted-foreground">{timeLabel}</div>
      <div className={cn('mt-0.5 flex items-center gap-1 font-semibold', slot.active ? 'text-primary' : 'text-rose-500')}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
        {slot.active ? 'Agent 通信正常' : '未检测到 Agent 通信'}
      </div>
      <div className="mt-1.5 space-y-0.5 text-foreground">
        <div>CPU {pct(s?.cpu)}</div>
        <div>内存 {pct(s?.mem)}</div>
        <div>磁盘 {pct(s?.disk)}</div>
        <div>↓ {bytes(s?.netIn ?? 0)}/s · ↑ {bytes(s?.netOut ?? 0)}/s</div>
      </div>
      {note && <div className="mt-2 text-[10px] leading-4 text-muted-foreground">{note}</div>}
    </div>
  )
}

function buildTitle(slot: TimelineSlot) {
  const s = slot.sample
  return [
    formatTime(s?.t ?? slot.end),
    slot.active ? 'Agent 通信正常' : '未检测到 Agent 通信',
    '来源：Agent 与 Server 最近上报',
    `CPU ${pct(s?.cpu)}`,
    `内存 ${pct(s?.mem)}`,
    `磁盘 ${pct(s?.disk)}`,
    `↓ ${bytes(s?.netIn ?? 0)}/s · ↑ ${bytes(s?.netOut ?? 0)}/s`,
  ].join('\n')
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

function buildEmptyTimeline(intervalMinutes = 3, slots = 80, now = Date.now()): TimelineSlot[] {
  const intervalMs = intervalMinutes * 60 * 1000
  const windowEnd = Math.ceil(now / intervalMs) * intervalMs
  const windowStart = windowEnd - slots * intervalMs
  return Array.from({ length: slots }, (_, index) => {
    const start = windowStart + index * intervalMs
    return { active: false, start, end: start + intervalMs, sample: null, reason: 'empty' }
  })
}

function lastSampleInWindow(sorted: HistorySample[], slotStart: number, slotEnd: number) {
  let sample: HistorySample | null = null
  for (const item of sorted) {
    if (item.t < slotStart) continue
    if (item.t >= slotEnd) break
    sample = item
  }
  return sample
}

export function buildAgentTimeline(
  agentHistory: HistorySample[],
  online: boolean,
  intervalMinutes = 3,
  slots = 80,
  now = Date.now(),
): TimelineSlot[] {
  const intervalMs = intervalMinutes * 60 * 1000
  const sorted = [...agentHistory].sort((a, b) => a.t - b.t)
  const latest = sorted.at(-1) ?? null
  const windowEnd = Math.ceil(now / intervalMs) * intervalMs
  const windowStart = windowEnd - slots * intervalMs

  return Array.from({ length: slots }, (_, index) => {
    const start = windowStart + index * intervalMs
    const end = start + intervalMs
    const sample = lastSampleInWindow(sorted, start, end)
    const isLatestSlot = index === slots - 1
    const useLatestCurrent = !sample && isLatestSlot && online && latest && now - latest.t <= intervalMs * 2
    const active = Boolean(sample || useLatestCurrent)
    return {
      active,
      start,
      end,
      sample: sample || (useLatestCurrent ? latest : null),
      reason: active ? 'agent' : 'empty',
    }
  })
}
