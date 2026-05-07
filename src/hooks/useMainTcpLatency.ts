import { useEffect, useMemo, useState } from 'react'
import { taskQuery } from '../api/methods'
import type { BackendPool } from '../api/pool'
import type { Node, TaskQueryResult } from '../types'
import { computeLatencyStats, type LatencyStats } from '../utils/latency'

const QUERY_TIMEOUT_MS = 10_000
const WINDOW_MS = 100 * 60 * 1000
const MAX_NODES = 80

export type TcpSummaryByUuid = Record<string, LatencyStats[]>

export function useMainTcpLatency(pool: BackendPool | null, nodes: Node[]) {
  const [rowsByUuid, setRowsByUuid] = useState<Record<string, TaskQueryResult[]>>({})
  const [loading, setLoading] = useState(false)

  const key = useMemo(() => nodes.map(n => `${n.source}:${n.uuid}`).join('|'), [nodes])

  useEffect(() => {
    if (!pool || !nodes.length) {
      setRowsByUuid({})
      return
    }

    let cancelled = false

    async function run() {
      setLoading(true)
      const windowRange: [number, number] = [Date.now() - WINDOW_MS, Date.now()]
      const visible = nodes.slice(0, MAX_NODES)
      const grouped: Record<string, TaskQueryResult[]> = {}

      await Promise.allSettled(
        visible.map(async node => {
          const entry = pool.entries.find(e => e.name === node.source)
          if (!entry) return
          const rows = await taskQuery(
            entry.client,
            [{ uuid: node.uuid }, { timestamp_from_to: windowRange }, { type: 'tcp_ping' }],
            QUERY_TIMEOUT_MS,
          )
          grouped[node.uuid] = rows
        }),
      )

      if (!cancelled) {
        setRowsByUuid(grouped)
        setLoading(false)
      }
    }

    run().catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [pool, key])

  const summaryByUuid = useMemo<TcpSummaryByUuid>(() => {
    const out: TcpSummaryByUuid = {}
    for (const [uuid, rows] of Object.entries(rowsByUuid)) {
      out[uuid] = computeLatencyStats(rows, 'tcp_ping').slice(0, 3)
    }
    return out
  }, [rowsByUuid])

  return { summaryByUuid, loading }
}
