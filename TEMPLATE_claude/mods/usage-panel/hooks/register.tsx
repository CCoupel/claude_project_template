import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { buildView, formatReset, formatResetShort, isTeammateSession, shortLabelOf } from './lib'

// Toast (petite boîte en haut à droite du transcript, quelques secondes) : affiché au démarrage, à chaque fois
// qu'une fenêtre de quota bouge d'un point, et sur /panel-usage. Ni panneau ni bandeau : rien de permanent.
const empty: View = { windows: [], costUsd: null, updatedAt: 0 }
const view = atom({ plugin: 'usage-panel', key: 'view' } as const, empty)

let isTeammate = false
let lastShown = ''
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

/** « Session 53 % (15:00) · Semaine 95 % (mer. 12:00) · Fable sem. 17 % (mer. 12:00) », ⚠ au-delà du seuil. */
export function toastLine(v: View, now: number, warnPercent: number): string {
  return v.windows
    .map(w => {
      const pct = Math.round(w.percentUsed)
      const mark = pct >= 90 ? '🔴 ' : pct >= warnPercent ? '⚠ ' : ''
      const reset = formatResetShort(w.resetsAt, now)
      return `${mark}${shortLabelOf(w.kind)} ${pct} %${reset ? ` (${reset})` : ''}`
    })
    .join(' · ')
}

async function show($: any, isForced: boolean) {
  const v = await read($, view)
  if (v.windows.length === 0) return false
  const line = toastLine(v, await $.clock.now(), warnPercent)
  // Sans changement visible (même ligne, à la minute près), pas de nouveau toast — sauf sur demande.
  if (!isForced && line === lastShown) return false
  lastShown = line
  $.ui.toast(line, { timeoutMs })
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
    await $.command.register({ name: 'panel-usage', description: 'Affiche la consommation du compte Claude (toast + détail)' })
    void refresh($).then(() => show($, false))
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

  // Mesure poussée par le moteur après chaque tour et dès qu'une fenêtre bouge d'un point :
  // toast seulement quand une fenêtre a bougé (changed contient `rateLimits`).
  on('session.measure', async ($, e, next) => {
    if (isTeammate) return next(e)
    const now = await $.clock.now()
    await update($, view, () => buildView(e.rateLimits ?? [], e.cost?.usd ?? null, now))
    if ((e.changed ?? []).includes('rateLimits')) void show($, false)
    return next(e)
  })
}
