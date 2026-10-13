import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { bar, buildView, formatReset, formatResetShort, isTeammateSession, shortLabelOf } from './lib'

// Ligne de statut permanente sous le prompt (une par mod, remplacée à chaque mesure) ; toast en plus seulement
// quand une fenêtre franchit le seuil d'alerte ou 90 %, et sur /panel-usage. Ni panneau ni bandeau.
const empty: View = { windows: [], costUsd: null, updatedAt: 0 }
const view = atom({ plugin: 'usage-panel', key: 'view' } as const, empty)

let isTeammate = false
let lastShown = ''
let lastLevels: Record<string, number> = {}
let warnPercent = 70
let timeoutMs = 8_000

async function detectTeammate($: any) {
  const env = await Promise.all([
    $.env.get('CLAUDE_CODE_AGENT_ID'),
    $.env.get('CLAUDE_CODE_AGENT_NAME'),
    $.env.get('CLAUDE_CODE_TEAM_NAME'),
  ])
  const res = await $.process.run(['sh', '-c', 'tr "\\0" " " < /proc/$PPID/cmdline 2>/dev/null'])
  return isTeammateSession(env, res.exitCode === 0 ? res.stdout : '')
}

const BAR_W = 10

/** « Session █████░░░░░ 53 % (15:00) · Semaine █████████▌ 95 % (mer. 12:00) », ⚠/🔴 au-delà des seuils. */
export function toastLine(v: View, now: number, warnPercent: number, barWidth = BAR_W): string {
  return v.windows
    .map(w => {
      const pct = Math.round(w.percentUsed)
      const mark = pct >= 90 ? '🔴 ' : pct >= warnPercent ? '⚠ ' : ''
      const reset = formatResetShort(w.resetsAt, now)
      const b = bar(w.percentUsed, barWidth)
      return `${mark}${shortLabelOf(w.kind)} ${'█'.repeat(b.filled)}${'░'.repeat(b.empty)} ${pct} %${reset ? ` (${reset})` : ''}`
    })
    .join('  ·  ')
}

/** 0 sous le seuil, 1 au-delà, 2 à partir de 90 % : un toast à chaque franchissement vers le haut. */
const levelOf = (pct: number) => (pct >= 90 ? 2 : pct >= warnPercent ? 1 : 0)

async function show($: any, isForced: boolean) {
  const v = await read($, view)
  if (v.windows.length === 0) {
    $.ui.status(undefined)
    return false
  }
  const line = toastLine(v, await $.clock.now(), warnPercent)
  if (line !== lastShown) {
    lastShown = line
    $.ui.status(line)
  }
  const levels: Record<string, number> = {}
  let isCrossing = false
  for (const w of v.windows) {
    levels[w.kind] = levelOf(w.percentUsed)
    if (w.kind in lastLevels && levels[w.kind] > lastLevels[w.kind]) isCrossing = true
  }
  lastLevels = levels
  if (isForced || isCrossing) $.ui.toast(line, { timeoutMs })
  return true
}

async function refresh($: any) {
  const u = await $.session.usage()
  const now = await $.clock.now()
  await update($, view, () => buildView(u.rateLimits ?? [], u.cost?.usd ?? null, now))
}

export const register: Register = (on, options) => {
  warnPercent = Number((options as any)?.userConfig?.warnPercent ?? 70)
  timeoutMs = Math.max(1, Number((options as any)?.userConfig?.toastSec ?? 8)) * 1000

  on('session.start', async ($, e, next) => {
    // Réservé au team-leader : une session de teammate n'affiche rien.
    isTeammate = await detectTeammate($).catch(() => false)
    if (isTeammate) return next(e)
    await $.command.register({ name: 'panel-usage', description: 'Recharge la ligne de consommation du compte Claude (toast + détail)' })
    void refresh($).then(() => show($, false))
    // Les heures de réinitialisation avancent (« 42 min ») même sans nouvelle mesure.
    $.clock.every(60_000, () => void refresh($).then(() => show($, false)))
    return next(e)
  })

  // /panel-usage = relecture immédiate, toast, et détail en réponse (libellés complets, réinitialisation).
  on('command.run', { command: 'panel-usage' }, async $ => {
    if (isTeammate) return { text: 'Réservé au team-leader.' }
    await update($, view, () => empty)
    await refresh($)
    const v = await read($, view)
    if (v.windows.length === 0) return { text: 'Aucune limite rapportée (pas d’abonnement, ou aucune réponse reçue).' }
    await show($, true)
    const now = await $.clock.now()
    const lines = v.windows.map(w => `${w.label} : ${Math.round(w.percentUsed)} % (${formatReset(w.resetsAt, now) || 'réinitialisation inconnue'})`)
    return { text: lines.join('\n') }
  })

  // Mesure poussée par le moteur après chaque tour et dès qu'une fenêtre bouge d'un point.
  on('session.measure', async ($, e, next) => {
    if (isTeammate) return next(e)
    const now = await $.clock.now()
    await update($, view, () => buildView(e.rateLimits ?? [], e.cost?.usd ?? null, now))
    void show($, false)
    return next(e)
  })
}
