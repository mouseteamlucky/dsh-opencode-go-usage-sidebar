/**
 * @deepseek-ai/dsh-host-opencode-usage — same-origin bridge to OpenCode Go's
 * official quota API. The sidebar usage widget fetches this route; the Go
 * bearer token is read from the local Codex config and never leaves the host.
 * @module @deepseek-ai/dsh-host-opencode-usage
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webserver's Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Stable Cordis plugin name. */
export const name = 'opencode-usage'

/** The webserver service carrying the route registry. */
export const inject = ['webServer']

/** The official OpenCode Go quota endpoint. */
const API_URL = 'https://opencode.ai/zen/go/v1/usage'
/** Same-origin path the Web GUI fetches. */
const ROUTE_PATH = '/api/opencode-go/usage'
/** Bridge-side cache so a per-minute poll never hammers the official API. */
const CACHE_TTL_MS = 30_000
const FETCH_TIMEOUT_MS = 15_000

/** One quota window as reported by the official API. */
export interface UsageWindow {
  status: string
  percent: number
  resetsAt: string
}

/** The official quota payload. */
export interface GoUsagePayload {
  usage: {
    rolling: UsageWindow
    weekly: UsageWindow
    monthly: UsageWindow
  }
}

/**
 * Extract the OpenCode Go bearer token from a Codex `config.toml` body: the
 * token line inside the `[model_providers.opencode]` section.
 * @param configText - raw config.toml text.
 * @returns the token, or undefined when the provider section or line is absent.
 */
export function resolveToken(configText: string): string | undefined {
  const section = configText.match(/\[model_providers\.opencode\]([\s\S]*?)(?=\r?\n\[|$)/)
  if (section === null) return undefined
  const token = section[1]?.match(/experimental_bearer_token\s*=\s*["']([^"']+)["']/)
  return token?.[1]
}

/**
 * Read the token from the user's Codex config file.
 * @returns the token, or undefined when the file is missing or unreadable.
 */
export function resolveTokenFromConfig(): string | undefined {
  try {
    return resolveToken(readFileSync(join(homedir(), '.codex', 'config.toml'), 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Query the official quota API.
 * @param token - the OpenCode Go bearer token.
 * @returns the upstream status code and parsed (or fallback) body.
 */
export async function fetchGoUsage(token: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'dsh-opencode-usage/0.1',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const text = await response.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = { error: 'unexpected-response', raw: text.slice(0, 200) }
  }
  return { status: response.status, body }
}

/**
 * Mount the same-origin usage route. Answers JSON: the official quota payload
 * plus `fetchedAt`; upstream 401/403 and local token problems carry a
 * human-readable `message`. Responses never contain the token.
 * @param ctx - plugin context carrying the webServer service.
 */
export function apply(ctx: Context): void {
  let cache: { at: number; status: number; payload: string } | undefined
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { Allow: 'GET, HEAD' })
          res.end()
          return
        }
        const now = Date.now()
        if (cache !== undefined && now - cache.at < CACHE_TTL_MS) {
          res.writeHead(cache.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(cache.payload)
          return
        }
        const token = process.env.OPENCODE_GO_TOKEN ?? resolveTokenFromConfig()
        let status = 502
        let payload: Record<string, unknown>
        if (token === undefined) {
          status = 503
          payload = {
            error: 'no-token',
            message: 'OpenCode Go bearer token not found in ~/.codex/config.toml ([model_providers.opencode].experimental_bearer_token) and OPENCODE_GO_TOKEN is unset.',
          }
        } else {
          try {
            const result = await fetchGoUsage(token)
            status = result.status
            payload = result.body as Record<string, unknown>
            if (status === 401) payload = { ...payload, message: 'OpenCode Go rejected the local token (401) — log in to OpenCode Go again to refresh it.' }
            if (status === 403) payload = { ...payload, message: 'This account has no OpenCode Go subscription (403).' }
          } catch (error) {
            status = 502
            payload = { error: 'upstream-unreachable', message: error instanceof Error ? error.message : String(error) }
          }
        }
        const body = JSON.stringify({ ...payload, fetchedAt: new Date().toISOString() })
        cache = { at: now, status, payload: body }
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(body)
      },
    }),
    'opencode-usage: usage route',
  )
}
