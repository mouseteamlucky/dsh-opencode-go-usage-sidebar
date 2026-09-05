/**
 * The sidebar browsing-region foot panel: three vertical OpenCode Go quota
 * meters under a compact title row, plus the refresh/updated row. Pure
 * projection: data arrives through the bound usage hook, the column state
 * through the slot owner share; nothing else enters from the owner.
 */

import { useEffect, useState } from 'react'
import {
  IconDataOutline16, IconRefreshOutline14, IconRightUpOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the 'sidebar.workspaces.footer' SlotMap row (declared by ui-workspace).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { NS } from './locales.ts'
import type { UsageSnapshot, UsageWindow } from './usage-monitor.ts'
import css from './UsagePanel.module.css'

/** Registrant-private injected share (arrives via the register inject factory). */
export interface UsageActionFace {
  hooks: {
    usage: {
      getSnapshot(): UsageSnapshot
      subscribe(listener: () => void): () => void
    }
  }
  /** Re-query the bridge route immediately. */
  refresh(): void
}

/** Full panel props composed by the browsing-region footer slot. */
export type UsagePanelProps =
  PropsRuntime<'sidebar.workspaces.footer'>
  & InjectFace<UsageActionFace>
  & PropsLocale<typeof NS>

interface MeterSpec {
  readonly kind: 'rolling' | 'weekly' | 'monthly'
  readonly label: 'rolling' | 'weekly' | 'monthly'
}

const METERS: readonly MeterSpec[] = [
  { kind: 'rolling', label: 'rolling' },
  { kind: 'weekly', label: 'weekly' },
  { kind: 'monthly', label: 'monthly' },
]

/** Usage-level color class: calm below 60%, warning below 85%, danger after. */
function levelClass(percent: number): string | undefined {
  if (percent >= 85) return css.danger
  if (percent >= 60) return css.warning
  return css.ok
}

/** Compact duration until the reset instant ("1h23m"). */
function remainingLabel(untilMs: number): string {
  const totalMinutes = Math.floor(Math.max(0, untilMs) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`
}

/** One vertical quota meter inside the panel. */
function MeterRow({ label, window: quota, t }: {
  label: string
  window: UsageWindow
  t: TranslateNS<typeof NS>
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(Date.now()) }, 30_000)
    return () => { window.clearInterval(timer) }
  }, [])
  const percent = quota.percent
  return (
    <div className={css.meterRow}>
      <div className={css.meterHead}>
        <span className={css.meterLabel}>{label}</span>
        <span className={css.meterValue}>{percent}% · {t('remaining')} {100 - percent}%</span>
      </div>
      <div className={css.track}>
        <div className={`${css.fill} ${levelClass(percent)}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <div className={css.meterFoot}>{remainingLabel(new Date(quota.resetsAt).getTime() - now)} {t('resetsIn')}</div>
    </div>
  )
}

/** Render the browsing-region foot quota panel (null in the 56px rail). */
export function UsagePanel({ wide, useUsage, refresh, t }: UsagePanelProps) {
  const snapshot = useUsage(identity => identity)
  if (!wide) return null
  const windows = snapshot.data?.usage
  const rolling = windows?.rolling
  const summary = snapshot.phase === 'error'
    ? t('error')
    : windows === undefined
      ? t('loading')
      : t('summary')
        .replace('{rolling}', String(windows.rolling.percent))
        .replace('{weekly}', String(windows.weekly.percent))
        .replace('{monthly}', String(windows.monthly.percent))

  return (
    <div className={css.root}>
      <div className={css.head}>
        <IconDataOutline16 size={14} />
        <span className={css.label}>{t('title')}</span>
        {rolling !== undefined && <span className={`${css.dot} ${levelClass(rolling.percent)}`} />}
        {windows !== undefined && <span className={css.summary}>{summary}</span>}
      </div>
      {snapshot.phase === 'ready' && windows !== undefined ? (
        <>
          {METERS.map(({ kind, label }) => (
            <MeterRow key={kind} label={t(label)} window={windows[kind]} t={t} />
          ))}
          <div className={css.foot}>
            <span className={css.updated}>
              {t('updatedAt')} {snapshot.fetchedAt === undefined ? '—' : new Date(snapshot.fetchedAt).toLocaleTimeString()}
            </span>
            <div className={css.actions}>
              <button type="button" className={css.action} onClick={() => { refresh() }}>
                <IconRefreshOutline14 size={12} />
                {t('refresh')}
              </button>
              <a
                className={css.action}
                href="https://opencode.ai/workspace/wrk_01M01BX6QTNG0E111SWAEPH4HJ/go"
                target="_blank"
                rel="noreferrer"
              >
                {t('openDashboard')}
                <IconRightUpOutline14 size={12} />
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className={css.stateRow}>
          {snapshot.phase === 'error' ? `${t('error')}${snapshot.error === undefined ? '' : `: ${snapshot.error}`}` : t('loading')}
        </div>
      )}
    </div>
  )
}
