import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { bar, buildView, colorOf, formatReset, formatResetShort, isTeammateSession, shortLabelOf } from './lib'

// Bandeau d'une ligne au-dessus du prompt (AbovePrompt), pas un panneau : il cohabite avec le panneau
// milestone sans onglet. `/panel-usage` le recharge et répond avec les valeurs relues.
const BAR_W = 10
const empty: View = { windows: [], costUsd: null, updatedAt: 0 }
const view = atom({ plugin: 'usage-panel', key: 'view' } as const, empty)

let isTeammate = false

async function detectTeammate($: any) {
  const env = await Promise.all([
    $.env.get('CLAUDE_CODE_AGENT_ID'),
    $.env.get('CLAUDE_CODE_AGENT_NAME'),
    $.env.get('CLAUDE_CODE_TEAM_NAME'),
  ])
  const res = await $.process.run(['sh', '-c', 'tr "\\0" " " < /proc/$PPID/cmdline 2>/dev/null'])
  return isTeammateSession(env, res.exitCode === 0 ? res.stdout : '')
}

async function refresh($: any) {
  const u = await $.session.usage()
  const now = await $.clock.now()
  await update($, view, () => buildView(u.rateLimits ?? [], u.cost?.usd ?? null, now))
}

export const register: Register = (on, options) => {
  const warnPercent = Number((options as any)?.userConfig?.warnPercent ?? 70)

  on('session.start', async ($, e, next) => {
    // Bandeau réservé au team-leader : une session de teammate ne l'affiche ni ne le rafraîchit.
    isTeammate = await detectTeammate($).catch(() => false)
    if (isTeammate) return next(e)
    await $.command.register({ name: 'panel-usage', description: 'Recharge le bandeau de consommation du compte Claude' })
    void refresh($)
    // Les heures de réinitialisation avancent (« 42 min ») même sans nouvelle mesure.
    $.clock.every(60_000, () => void refresh($))
    return next(e)
  })

  // /panel-usage = reload : état remis à zéro, mesure relue (attendue), redessin forcé.
  on('command.run', { command: 'panel-usage' }, async $ => {
    if (isTeammate) return { text: 'Bandeau réservé au team-leader.' }
    await update($, view, () => empty)
    await refresh($)
    $.ui.invalidate('ui.render')
    const v = await read($, view)
    if (v.windows.length === 0) return { text: 'Bandeau de consommation rechargé : aucune limite rapportée.' }
    const now = await $.clock.now()
    const lines = v.windows.map(w => `${w.label} : ${Math.round(w.percentUsed)} % (${formatReset(w.resetsAt, now) || 'réinitialisation inconnue'})`)
    return { text: `Bandeau de consommation rechargé.\n${lines.join('\n')}` }
  })

  // Mesure poussée par le moteur après chaque tour et dès qu'une fenêtre bouge d'un point.
  on('session.measure', async ($, e, next) => {
    if (isTeammate) return next(e)
    const now = await $.clock.now()
    await update($, view, () => buildView(e.rateLimits ?? [], e.cost?.usd ?? null, now))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (isTeammate || e.props.hasSurvey) return next(e)
    const v = await read($, view)
    if (v.windows.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const columns = e.props.bodyColumns ?? 80

    const cells = v.windows.map(w => {
      const label = shortLabelOf(w.kind)
      const pct = `${Math.round(w.percentUsed)} %`
      const reset = formatResetShort(w.resetsAt, now)
      const width = label.length + 1 + pct.length + 1 + BAR_W + (reset ? 1 + reset.length : 0)
      return { label, pct, reset, width, color: colorOf(w.percentUsed, warnPercent), bar: bar(w.percentUsed, BAR_W) }
    })
    const SEP = '  │  '
    const oneLine = cells.reduce((a, c) => a + c.width, 0) + SEP.length * (cells.length - 1) <= columns

    // Arbre construit par une fonction (pas un composant) : les éléments viennent de la table de la surface.
    const cell = (c: (typeof cells)[number]) => (
      <Text wrap="truncate-end">
        <Text bold>{c.label}</Text>
        <Text color={c.color} bold>{` ${c.pct} `}</Text>
        <Text color={c.color}>{'█'.repeat(c.bar.filled)}</Text>
        <Text dimColor>{'░'.repeat(c.bar.empty)}</Text>
        {c.reset !== '' && <Text dimColor>{` ${c.reset}`}</Text>}
      </Text>
    )

    // Une seule ligne quand elle tient dans la largeur ; sinon une ligne par fenêtre.
    if (oneLine)
      return (
        <Box>
          {cells.map((c, k) => (
            <Box>
              {k > 0 && <Text dimColor>{SEP}</Text>}
              {cell(c)}
            </Box>
          ))}
        </Box>
      )
    return (
      <Box flexDirection="column">
        {cells.slice(0, Math.max(1, e.props.maxRows ?? cells.length)).map(c => cell(c))}
      </Box>
    )
  })
}
