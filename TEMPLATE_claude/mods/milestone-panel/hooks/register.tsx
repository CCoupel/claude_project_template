import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { TEAMMATE_ENV, buildView, groupByPhase, isConsistent, isTeammateSession, parseGhIssueCommand } from './lib'
import type { Expectation } from './lib'

const PANE = 'milestone-panel'
const RETRY_MS = 15_000

const empty: View = { current: null, issues: [], milestones: [], updatedAt: 0, error: null }
const view = atom({ plugin: 'milestone-panel', key: 'view' } as const, empty)

let pending: { cancel: () => void } | null = null
let expected: Expectation[] = []
let isRunning = false
let retries = 0
let isTeammate = false

async function detectTeammate($: any) {
  const env = await Promise.all(TEAMMATE_ENV.map(n => $.env.get(n)))
  const res = await $.process.run(['sh', '-c', 'tr "\\0" " " < /proc/$PPID/cmdline 2>/dev/null'])
  return isTeammateSession(env, res.exitCode === 0 ? res.stdout : '')
}

async function gh($: any, argv: string[]) {
  const res = await $.process.run(['gh', ...argv])
  if (res.exitCode !== 0) throw new Error(res.stderr.trim() || `gh exit ${res.exitCode}`)
  return JSON.parse(res.stdout)
}

async function refresh($: any) {
  if (isRunning) return
  isRunning = true
  try {
    const [ms, issues] = await Promise.all([
      gh($, ['api', 'repos/{owner}/{repo}/milestones?state=open&per_page=100']),
      gh($, [
        'issue', 'list', '--state', 'open', '--limit', '500',
        '--json', 'number,title,labels,milestone',
      ]),
    ])
    const now = await $.clock.now()
    await update($, view, () => buildView(ms, issues, now))
    if (expected.length > 0) {
      const isOk = isConsistent(issues, expected)
      if (isOk || retries >= 1) {
        expected = []
        retries = 0
      } else {
        retries += 1
        pending?.cancel()
        pending = $.clock.after(RETRY_MS, () => void refresh($))
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await update($, view, v => ({ ...v, error: message }))
  } finally {
    isRunning = false
  }
}

export const register: Register = (on, options) => {
  const delayMs = Math.max(1, Number(options.propagationDelaySec ?? 10)) * 1000
  const everyMs = Math.max(30, Number(options.refreshIntervalSec ?? 300)) * 1000

  on('session.start', async ($, e, next) => {
    // Panneau réservé au team-leader : une session de teammate ne l'ouvre ni ne le rafraîchit.
    isTeammate = await detectTeammate($).catch(() => false)
    if (isTeammate) return next(e)
    await $.command.register({
      name: 'milestone-panel',
      description: 'Ouvre le panneau des issues du milestone en cours',
    })
    void $.ui.open({ id: PANE, title: 'Milestone' })
    void refresh($)
    $.clock.every(everyMs, () => void refresh($))
    return next(e)
  })

  on('command.run', { command: 'milestone-panel' }, async $ => {
    if (isTeammate) return { text: 'Panneau réservé au team-leader.' }
    await $.ui.open({ id: PANE, title: 'Milestone' })
    void refresh($)
    return { text: 'Panneau milestone ouvert.' }
  })

  // Les labels de phase sont posés par le teamleader via `gh issue edit` (GITHUB.md §9) :
  // on relit GitHub après un délai de propagation, relancé à chaque nouvelle commande.
  // Les appels faits par des sous-agents ne sont peut-être pas vus : le timer périodique couvre.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (isTeammate) return ran
    const found = parseGhIssueCommand(String((e as { command?: string }).command ?? ''))
    if (found.length > 0) {
      expected = [...expected, ...found]
      retries = 0
      pending?.cancel()
      pending = $.clock.after(delayMs, () => void refresh($))
    }
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const v = await read($, view)
    const width = Math.max(10, (e.viewport?.cols ?? 40) - 4)
    const cut = (s: string) => (s.length > width ? `${s.slice(0, width - 1)}…` : s)

    if (v.updatedAt === 0 && !v.error) return <Text dimColor>Chargement…</Text>

    const bar = (closed: number, total: number) => {
      const n = total === 0 ? 0 : Math.round((closed / total) * 10)
      return `${'█'.repeat(n)}${'░'.repeat(10 - n)}`
    }

    return (
      <Box flexDirection="column">
        {v.error && <Text color="red">{cut(`gh: ${v.error}`)}</Text>}
        {v.current ? (
          <Box flexDirection="column">
            <Text bold>{`Milestone ${v.current}`}</Text>
            {groupByPhase(v.issues).map(g => (
              <Box flexDirection="column">
                <Text bold dimColor>{`${g.phase} (${g.issues.length})`}</Text>
                {g.issues.map(i => (
                  <Text color={i.isBlocked ? 'red' : undefined}>
                    {cut(`${i.isBlocked ? '⛔' : ' '} #${i.number} ${i.title}`)}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text bold>Aucun milestone en cours</Text>
            {v.milestones.length === 0 && <Text dimColor>Aucun milestone ouvert.</Text>}
            {v.milestones.map(m => {
              const total = m.open + m.closed
              const pct = total === 0 ? 0 : Math.round((m.closed / total) * 100)
              return (
                <Text>{cut(`${m.title}  ${bar(m.closed, total)} ${pct}% (${m.closed}/${total})`)}</Text>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })
}
