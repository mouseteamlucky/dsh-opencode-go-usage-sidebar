/**
 * Browser OpenCode Go usage widget: a `sidebar.workspaces.footer` entry — a
 * quota panel pinned below the sidebar's session list with three vertical
 * meters, fed by a poller over the same-origin bridge route.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the renderer plugin's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the 'sidebar.workspaces.footer' SlotMap row (declared by the
// workspace package) must be in the program for the register call to type.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { UsageMonitor } from './usage-monitor.ts'
import { en, NS, zh, type UsageKey } from './locales.ts'
import { UsagePanel, type UsageActionFace } from './UsagePanel.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Usage widget copy. */
    'opencode-usage': UsageKey
  }
}

/** Required services: the footer slot, the locale service, and the poller's bridge route. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: mount the poller and register the panel. The
 * registration rides the slot service's inject wrapper so plugin unload
 * removes the panel; the poller runs while the plugin lives.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage: dictionaries')
  const monitor = new UsageMonitor()
  ctx.effect(() => {
    monitor.start()
    return () => { monitor.stop() }
  }, 'ui-usage: poller')
  ctx.slots.inject('sidebar.workspaces.footer', () => ctx.slots.register({
    name: 'sidebar.workspaces.footer',
    id: 'opencode-go-usage',
    order: 50,
    locale: NS,
    inject: (): UsageActionFace => ({
      hooks: { usage: monitor },
      refresh: () => { void monitor.refresh() },
    }),
  }, UsagePanel))
}
