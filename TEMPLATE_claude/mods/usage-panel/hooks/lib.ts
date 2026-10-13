import type { View, Window } from '../types'

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

const MODELS: Record<string, string> = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', fable: 'Fable', mythos: 'Mythos' }
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Libellé français d'une fenêtre de quota, à partir de son `kind`. */
export function labelOf(kind: string): string {
  const k = kind.toLowerCase()
  const model = Object.keys(MODELS).find(m => k.includes(m))
  const prefix = model ? `${MODELS[model]} ` : ''
  if (k.includes('five_hour') || k.includes('5h')) return prefix ? `${prefix}— session` : 'Session actuelle'
  if (k.includes('seven_day') || k.includes('7d') || k.includes('week')) return prefix ? `${prefix}cette semaine` : 'Cette semaine'
  if (k.includes('spend')) return 'Plafond de dépense'
  return kind
}

/** Ordre d'affichage : session, semaine, puis les limites par modèle, puis le reste. */
export function rank(kind: string): number {
  const k = kind.toLowerCase()
  const hasModel = Object.keys(MODELS).some(m => k.includes(m))
  if (k.includes('five_hour')) return hasModel ? 2 : 0
  if (k.includes('seven_day')) return hasModel ? 3 : 1
  return 4
}

export function buildView(limits: RateLimit[], costUsd: number | null, now: number): View {
  const windows: Window[] = limits
    .map(l => ({ kind: l.kind, label: labelOf(l.kind), percentUsed: Math.max(0, l.percentUsed), resetsAt: l.resetsAt ?? null }))
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.kind.localeCompare(b.kind))
  return { windows, costUsd, updatedAt: now }
}

const two = (n: number) => String(n).padStart(2, '0')

/**
 * « Réinitialisation à 15:00 » le jour même, « le mercredi 12:00 » sinon ;
 * « dans 42 min » quand elle est à moins d'une heure. Heure locale du processus.
 */
export function formatReset(resetsAt: string | null, now: number): string {
  if (!resetsAt) return ''
  const t = new Date(resetsAt)
  if (Number.isNaN(t.getTime())) return ''
  const diffMin = Math.round((t.getTime() - now) / 60_000)
  if (diffMin <= 0) return 'Réinitialisation imminente'
  if (diffMin < 60) return `Réinitialisation dans ${diffMin} min`
  const d = new Date(now)
  const hm = `${two(t.getHours())}:${two(t.getMinutes())}`
  const sameDay = t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate()
  if (sameDay) return `Réinitialisation à ${hm}`
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  const isTomorrow = t.getFullYear() === tomorrow.getFullYear() && t.getMonth() === tomorrow.getMonth() && t.getDate() === tomorrow.getDate()
  if (isTomorrow) return `Réinitialisation demain ${hm}`
  return `Réinitialisation le ${DAYS[t.getDay()]} ${hm}`
}

/** Couleur de la barre selon le seuil d'alerte configuré. */
export function colorOf(percent: number, warnPercent: number): string {
  if (percent >= 90) return 'red'
  if (percent >= warnPercent) return 'yellow'
  return 'blue'
}

/** Barre « ████░░░░ » de `width` cellules pour `percent` (0-100, borné). */
export function bar(percent: number, width: number): { filled: number; empty: number } {
  const p = Math.min(100, Math.max(0, percent))
  const filled = Math.round((p / 100) * width)
  return { filled, empty: width - filled }
}

/**
 * Session de teammate (spawn par le team-leader) : variables d'environnement d'agent/team posées,
 * ou ligne de commande du processus parent portant --agent-id/--agent-name/--team-name/--parent-session-id.
 * Même détection que milestone-panel.
 */
export const isTeammateSession = (env: Array<string | undefined>, cmdline: string) =>
  env.some(v => !!v) || /(^|\s)--(agent-id|agent-name|team-name|parent-session-id)(\s|=|$)/.test(cmdline)
