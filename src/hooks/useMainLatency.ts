import { useEffect, useMemo, useState } from 'react'
import { taskQuery } from '../api/methods'
import type { BackendPool } from '../api/pool'
import type { Node, TaskQueryResult } from '../types'
import { computeLatencyStats, computePingAvailability, type AgentHistory, type LatencyStats } from '../utils/latency'

const QUERY_TIMEOUT_MS = 10_000
const TCP_WINDOW_MS = 60 * 60 * 1000
const PING_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_NODES = 80

export type TcpSummaryByUuid = Record<string, LatencyStats[]>
export type AgentHistoryByUuid = Record<string, AgentHistory>

export function useMainLatency(pool: BackendPool | null, nodes: Node[]) {
  const [tcpRowsByUuid, setTcpRowsByUuid] = useState<Record<string, TaskQueryResult[]>>({})
  const [pingRowsByUuid, setPingRowsByUuid] = useState<Record<string, TaskQueryResult[]>>({})
  const [loading, setLoading] = useState(false)

  const key = useMemo(() => nodes.map(n => `${n.source}:${n.uuid}`).join('|'), [nodes])

  useEffect(() => {
    if (!pool || !nodes.length) {
      setTcpRowsByUuid({})
      setPingRowsByUuid({})
      return
    }

    let cancelled = false

    async function run() {
      setLoading(true)
      const now = Date.now()
      const tcpWindow: [number, number] = [now - TCP_WINDOW_MS, now]
      const pingWindow: [number, number] = [now - PING_WINDOW_MS, now]
      const visible = nodes.slice(0, MAX_NODES)
      const tcpGrouped: Record<string, TaskQueryResult[]> = {}
      const pingGrouped: Record<string, TaskQueryResult[]> = {}

      await Promise.allSettled(
        visible.map(async node => {
          const entry = pool.entries.find(e => e.name === node.source)
          if (!entry) return
          const [tcp, ping] = await Promise.all([
            taskQuery(
              entry.client,
              [{ uuid: node.uuid }, { timestamp_from_to: tcpWindow }, { type: 'tcp_ping' }],
              QUERY_TIMEOUT_MS,
            ),
            taskQuery(
              entry.client,
              [{ uuid: node.uuid }, { timestamp_from_to: pingWindow }, { type: 'ping' }],
              QUERY_TIMEOUT_MS,
            ),
          ])
          tcpGrouped[node.uuid] = tcp
          pingGrouped[node.uuid] = ping
        }),
      )

      if (!cancelled) {
        setTcpRowsByUuid(tcpGrouped)
        setPingRowsByUuid(pingGrouped)
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

  const tcpByUuid = useMemo<TcpSummaryByUuid>(() => {
    const out: TcpSummaryByUuid = {}
    for (const [uuid, rows] of Object.entries(tcpRowsByUuid)) {
      out[uuid] = computeLatencyStats(rows, 'tcp_ping', { fixedCarrierOrder: true }).slice(0, 3)
    }
    return out
  }, [tcpRowsByUuid])

  const agentByUuid = useMemo<AgentHistoryByUuid>(() => {
    const out: AgentHistoryByUuid = {}
    for (const node of nodes) {
      out[node.uuid] = computePingAvailability(pingRowsByUuid[node.uuid] || [])
    }
    return out
  }, [key, pingRowsByUuid])

  return { tcpByUuid, agentByUuid, loading }
}
