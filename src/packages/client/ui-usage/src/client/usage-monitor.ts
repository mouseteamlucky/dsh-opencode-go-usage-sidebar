/**
 * Live OpenCode Go quota monitor: polls the same-origin bridge route and
 * exposes an immutable snapshot through a minimal observable store. The
 * renderer binds it into a selector hook; no subscription machinery here.
 */

export interface UsageWindow {
  status: string
  percent: number
  resetsAt: string
}

/** The bridge route payload. */
export interface UsageData {
  usage: {
    rolling: UsageWindow
    weekly: UsageWindow
    monthly: UsageWindow
  }
}

/** Widget state: exactly one of the three phases. */
export interface UsageSnapshot {
  phase: 'loading' | 'ready' | 'error'
  data?: UsageData
  fetchedAt?: string
  error?: string
}

/** Same-origin bridge route mounted by dsh-host-opencode-usage. */
const ENDPOINT = '/api/opencode-go/usage'
/** Poll cadence: the bridge caches for 30s, so a minute keeps both sides calm. */
const REFRESH_INTERVAL_MS = 60_000

/** Minimal observable store the slot renderer binds into `useUsage`. */
export class UsageMonitor {
  private snapshot: UsageSnapshot = { phase: 'loading' }
  private readonly listeners = new Set<() => void>()
  private timer: number | undefined
  private inflight = false

  /** Begin polling (idempotent): one immediate refresh, then the interval. */
  start(): void {
    if (this.timer !== undefined) return
    void this.refresh()
    this.timer = window.setInterval(() => { void this.refresh() }, REFRESH_INTERVAL_MS)
  }

  /** Stop polling. */
  stop(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
  }

  /** Fetch the latest quota snapshot from the bridge route. */
  async refresh(): Promise<void> {
    if (this.inflight) return
    this.inflight = true
    try {
      const response = await fetch(ENDPOINT, { cache: 'no-store' })
      const body = await response.json() as Record<string, unknown>
      if (response.ok && typeof body.usage === 'object' && body.usage !== null) {
        const next: UsageSnapshot = { phase: 'ready', data: body as unknown as UsageData }
        if (typeof body.fetchedAt === 'string') next.fetchedAt = body.fetchedAt
        this.set(next)
      } else {
        this.set({
          phase: 'error',
          error: typeof body.message === 'string' ? body.message : `HTTP ${response.status}`,
        })
      }
    } catch (error) {
      this.set({ phase: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      this.inflight = false
    }
  }

  /** Current snapshot (stable reference between changes). */
  getSnapshot(): UsageSnapshot {
    return this.snapshot
  }

  /** Subscribe to snapshot changes. @returns the unsubscriber. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private set(next: UsageSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}
