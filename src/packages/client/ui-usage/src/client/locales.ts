/** Dictionary namespace owned by this plugin (the usage widget copy). */
export const NS = 'opencode-usage'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  /** Trigger row label when the sidebar is wide. */
  title: 'OpenCode Go 用量',
  /** Compact three-window reading for the collapsed rail tooltip. */
  summary: '5小时 {rolling}% · 本周 {weekly}% · 本月 {monthly}%',
  /** Window names. */
  rolling: '5小时窗口',
  weekly: '本周',
  monthly: '本月',
  /** Meter captions. */
  remaining: '剩余',
  resetsIn: '后重置',
  /** Panel chrome. */
  updatedAt: '更新于',
  refresh: '刷新',
  openDashboard: '打开订阅页',
  /** States. */
  loading: '加载中…',
  error: '获取失败',
} satisfies Record<string, string>

/** The usage namespace key union. */
export type UsageKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  title: 'OpenCode Go usage',
  summary: '5h {rolling}% · week {weekly}% · month {monthly}%',
  rolling: '5-hour window',
  weekly: 'Weekly',
  monthly: 'Monthly',
  remaining: 'left',
  resetsIn: 'to reset',
  updatedAt: 'Updated',
  refresh: 'Refresh',
  openDashboard: 'Open dashboard',
  loading: 'Loading…',
  error: 'Failed to load',
} satisfies Record<UsageKey, string>
