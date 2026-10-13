import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { bar, buildView, colorOf, formatReset } from './lib'

const PANE = 'usage-panel'
const TITLE = 'Consommation'
const empty: View = { windows: [], costUsd: null, updatedAt: 0 }
const view = atom({ plugin: 'usage-panel', key: 'view' } as const, empty)

async function refresh($: any) {
  const u = await $.session.usage()
  const now = await $.clock.now()
  await update($, view, () => buildView(u.rateLimits ?? [], u.cost?.usd ?? null, now))
}

export const register: Register = (on, options) => {
  const warnPercent = Number((options as any)?.userConfig?.warnPercent ?? 70)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'usage-panel', description: 'Ouvre le panneau de consommation du compte Claude' })
    void $.ui.open({ id: PANE, title: TITLE, rows: 10 })
    void refresh($)
    // Les heures de réinitialisation avancent (« dans N min ») même sans nouvelle mesure.
    $.clock.every(60_000, () => void refresh($))
    return next(e)
  })

  on('command.run', { command: 'usage-panel' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE, rows: 10 })
    void refresh($)
    return { text: 'Panneau de consommation ouvert.' }
  })

  // Mesure poussée par le moteur après chaque tour et dès qu'une fenêtre bouge d'un point.
  on('session.measure', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, view, () => buildView(e.rateLimits ?? [], e.cost?.usd ?? null, now))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const v = await read($, view)
    const now = await $.clock.now()
    const columns = (e.viewport as { columns?: number } | undefined)?.columns ?? 40
    const width = Math.max(8, Math.min(30, columns - 10))

    if (v.updatedAt === 0) return <Text dimColor>Chargement…</Text>
    if (v.windows.length === 0)
      return (
        <Box flexDirection="column">
          <Text dimColor>Aucune limite rapportée (pas d'abonnement, ou aucune réponse reçue).</Text>
          {v.costUsd !== null && <Text dimColor>{`Coût session : ${v.costUsd.toFixed(2)} $`}</Text>}
        </Box>
      )

    return (
      <Box flexDirection="column">
        {v.windows.map(w => {
          const c = colorOf(w.percentUsed, warnPercent)
          const b = bar(w.percentUsed, width)
          const reset = formatReset(w.resetsAt, now)
          return (
            <Box flexDirection="column" marginBottom={1}>
              <Text wrap="truncate-end" bold>{w.label}</Text>
              <Text wrap="truncate-end">
                <Text color={c}>{'█'.repeat(b.filled)}</Text>
                <Text dimColor>{'░'.repeat(b.empty)}</Text>
                <Text color={c} bold>{` ${Math.round(w.percentUsed)} %`}</Text>
              </Text>
              {reset !== '' && <Text wrap="truncate-end" dimColor>{reset}</Text>}
            </Box>
          )
        })}
        <Text wrap="truncate-end" dimColor>
          {`${v.costUsd !== null ? `Coût session ${v.costUsd.toFixed(2)} $ · ` : ''}maj ${new Date(v.updatedAt).toTimeString().slice(0, 5)}`}
        </Text>
      </Box>
    )
  })
}
