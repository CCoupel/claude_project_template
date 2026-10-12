import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { buildView, groupByPhase, isConsistent, isTeammateSession, parseGhIssueCommand } from './lib'
import type { Expectation } from './lib'

const PANE = 'milestone-panel'
const RETRY_MS = 15_000

const empty: View = { current: null, issues: [], milestones: [], colors: {}, updatedAt: 0, error: null }
const view = atom({ plugin: 'milestone-panel', key: 'view' } as const, empty)

let pending: { cancel: () => void } | null = null
let expected: Expectation[] = []
let isRunning = false
let retries = 0
let isTeammate = false
let lastRefreshAt = 0
const THROTTLE_MS = 20_000

async function detectTeammate($: any) {
  const env = await Promise.all([
    $.env.get('CLAUDE_CODE_AGENT_ID'),
    $.env.get('CLAUDE_CODE_AGENT_NAME'),
    $.env.get('CLAUDE_CODE_TEAM_NAME'),
  ])
  const res = await $.process.run(['sh', '-c', 'tr "\\0" " " < /proc/$PPID/cmdline 2>/dev/null'])
  return isTeammateSession(env, res.exitCode === 0 ? res.stdout : '')
}

async function gh($: any, argv: string[]) {
  const res = await $.process.run(['gh', ...argv])
  if (res.exitCode !== 0) throw new Error(res.stderr.trim() || `gh exit ${res.exitCode}`)
  return JSON.parse(res.stdout)
}

async function refresh($: any) {
  pending = null
  if (isRunning) return
  isRunning = true
  try {
    const [ms, issues, labels] = await Promise.all([
      gh($, ['api', 'repos/{owner}/{repo}/milestones?state=open&per_page=100']),
      gh($, [
        'issue', 'list', '--state', 'open', '--limit', '500',
        '--json', 'number,title,labels,milestone',
      ]),
      gh($, ['label', 'list', '--limit', '200', '--json', 'name,color']),
    ])
    const now = await $.clock.now()
    lastRefreshAt = now
    await update($, view, () => buildView(ms, issues, now, Object.fromEntries(labels.map((l: any) => [l.name, l.color]))))
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
  const everyMs = Math.max(30, Number(options.refreshIntervalSec ?? 60)) * 1000

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
    } else if ((await $.clock.now()) - lastRefreshAt > THROTTLE_MS && !pending) {
      // Labels posés par un sous-agent : sa commande n'est pas toujours vue, on relit après toute commande Bash.
      pending = $.clock.after(delayMs, () => void refresh($))
    }
    return ran
  })

  // Le teamleader délègue la pose des labels (deployer) par SendMessage / Agent : on relit
  // peu après chaque délégation, puis une seconde fois pour laisser l'agent finir.
  for (const tool of ['SendMessage', 'Agent'] as const) {
    on('tool.call', { tool }, async ($, e, next) => {
      const ran = await next(e)
      if (isTeammate || (e as { agentId?: string }).agentId) return ran
      pending?.cancel()
      pending = $.clock.after(delayMs, () => {
        void refresh($)
        pending = $.clock.after(delayMs * 3, () => void refresh($))
      })
      return ran
    })
  }

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const v = await read($, view)
    const columns = (e.viewport as { columns?: number } | undefined)?.columns ?? 40
    // Le texte long est tronqué par le panneau lui-même, à sa vraie largeur.
    const T = (props: Record<string, unknown>, text: string) => (
      <Text wrap="truncate-end" {...props}>{text}</Text>
    )

    if (v.updatedAt === 0 && !v.error) return <Text dimColor>Chargement…</Text>

    const hex = (label: string, fallback: string) =>
      v.colors[label] ? `#${v.colors[label]}` : fallback
    const phaseColor = (phase: string) =>
      phase === 'SANS PHASE' ? 'gray' : hex(phase, 'white')
    const C_CLOSED = hex('DONE', 'green')
    const C_STARTED = hex('EN COURS', 'yellow')

    // Trois valeurs : fermées / démarrées (une phase) / non démarrées.
    const progress = (closed: number, started: number, notStarted: number) => {
      const total = closed + started + notStarted
      const width = Math.max(8, Math.min(30, columns - 16))
      const cells = (n: number) => (total === 0 ? 0 : Math.round((n / total) * width))
      const c = cells(closed)
      const s = Math.min(cells(started), width - c)
      const pct = total === 0 ? 0 : Math.round((closed / total) * 100)
      return (
        <Box flexDirection="column">
          <Text wrap="truncate-end">
            <Text color={C_CLOSED}>{'█'.repeat(c)}</Text>
            <Text color={C_STARTED}>{'█'.repeat(s)}</Text>
            <Text dimColor>{'░'.repeat(width - c - s)}</Text>
            <Text bold>{` ${pct}%`}</Text>
          </Text>
          <Text wrap="truncate-end">
            <Text color={C_CLOSED}>{`${closed} fermées`}</Text>
            <Text dimColor>{' · '}</Text>
            <Text color={C_STARTED}>{`${started} démarrées`}</Text>
            <Text dimColor>{` · ${notStarted} non démarrées`}</Text>
          </Text>
        </Box>
      )
    }

    const cur = v.milestones.find(m => m.title === v.current)
    const startedCount = v.issues.filter(i => i.phase !== 'SANS PHASE').length

    return (
      <Box flexDirection="column">
        <Text dimColor>{`maj ${new Date(v.updatedAt).toTimeString().slice(0, 5)}`}</Text>
        {v.error && T({ color: 'red' }, `gh: ${v.error}`)}
        {v.current ? (
          <Box flexDirection="column">
            {T({ bold: true, color: 'cyan' }, `Milestone ${v.current}`)}
            {cur && progress(cur.closed, startedCount, v.issues.length - startedCount)}
            {groupByPhase(v.issues).map(g => (
              <Box flexDirection="column" marginTop={1}>
                {T({ bold: true, color: phaseColor(g.phase) }, `${g.phase} (${g.issues.length})`)}
                {g.issues.map(i =>
                  T(
                    { color: i.isBlocked ? 'red' : undefined },
                    `${i.isBlocked ? '⛔' : ' '} #${i.number} ${i.title}`,
                  ),
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column">
            {T({ bold: true }, 'Aucun milestone en cours')}
            {v.milestones.length === 0 && <Text dimColor>Aucun milestone ouvert.</Text>}
            {v.milestones.map(m => (
              <Box flexDirection="column" marginTop={1}>
                {T({ bold: true, color: 'cyan' }, m.title)}
                {progress(m.closed, 0, m.open)}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
