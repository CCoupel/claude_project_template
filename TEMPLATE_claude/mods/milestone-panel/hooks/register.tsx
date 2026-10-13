import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../types'
import { PHASES, allocate, buildView, groupByLot, groupByPhase, isConsistent, isTeammateSession, parseGhIssueCommand } from './lib'
import type { Expectation } from './lib'

const PANE = 'milestone-panel'
const RETRY_MS = 15_000

const empty: View = { current: null, issues: [], milestones: [], colors: {}, isReleasing: false, updatedAt: 0, error: null }
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
      name: 'panel-milestone',
      description: 'Ouvre ou recharge le panneau des issues du milestone en cours',
    })
    void $.ui.open({ id: PANE, title: 'Milestone' })
    void refresh($)
    $.clock.every(everyMs, () => void refresh($))
    return next(e)
  })

  // /panel-milestone = reload : état remis à zéro, panneau rouvert, GitHub relu (attendu), redessin forcé.
  on('command.run', { command: 'panel-milestone' }, async $ => {
    if (isTeammate) return { text: 'Panneau réservé au team-leader.' }
    pending?.cancel()
    pending = null
    expected = []
    retries = 0
    lastRefreshAt = 0
    await update($, view, () => empty)
    await $.ui.open({ id: PANE, title: 'Milestone' })
    await refresh($)
    $.ui.invalidate('ui.render')
    const v = await read($, view)
    if (v.error) return { text: `Panneau milestone rechargé — erreur de lecture GitHub : ${v.error}` }
    const what = v.current
      ? `milestone ${v.current}${v.isReleasing ? ' (publication)' : ''}, ${v.issues.length} issue(s) ouverte(s)`
      : `${v.milestones.length} milestone(s) ouvert(s), aucun en cours`
    return { text: `Panneau milestone rechargé : ${what}.` }
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
    // Ordre de développement : fermées, puis phases du plus avancé au moins avancé, puis non démarrées.
    const ORDER = [...PHASES].reverse()
    const progress = (closed: number, byPhase: Record<string, number>, notStarted: number) => {
      const segs = [
        // Violet de GitHub pour « closed » : distinct du label DONE (vert).
        { label: 'fermées', n: closed, color: '#a371f7' },
        ...ORDER.filter(p => (byPhase[p] ?? 0) > 0).map(p => ({
          label: p,
          n: byPhase[p] ?? 0,
          color: phaseColor(p),
        })),
        { label: 'non démarrées', n: notStarted, color: 'gray' },
      ]
      const total = segs.reduce((a, x) => a + x.n, 0)
      const width = Math.max(8, Math.min(30, columns - 16))
      const cells = allocate(segs.map(x => x.n), width)
      const finished = closed + (byPhase.DONE ?? 0) // DONE = QA validée, issue fermée dès la CI verte
      const pct = total === 0 ? 0 : Math.round((finished / total) * 100)
      return (
        <Box flexDirection="column">
          <Text wrap="truncate-end">
            {segs.map((x, k) =>
              x.label === 'non démarrées' ? (
                <Text dimColor>{'░'.repeat(cells[k])}</Text>
              ) : (
                <Text color={x.color}>{'█'.repeat(cells[k])}</Text>
              ),
            )}
            {total === 0 && <Text dimColor>{'░'.repeat(width)}</Text>}
            <Text bold>{` ${pct}%`}</Text>
          </Text>
          <Text wrap="truncate-end">
            {segs
              .filter(x => x.n > 0 || x.label === 'fermées')
              .map((x, k) => (
                <Text color={x.color}>{`${k > 0 ? ' · ' : ''}${x.n} ${x.label}`}</Text>
              ))}
          </Text>
        </Box>
      )
    }

    // Libellés de phase alignés : « PHASE : #n titre », les suivantes « <blanc> : #n titre ».
    const LABEL_W = Math.max(...PHASES.map(p => p.length), 'SANS PHASE'.length)
    // Une ligne par issue : « LOT  PHASE : #n titre » ; lot et phase ne sont écrits que sur leur première ligne.
    const lotGroups = groupByLot(v.issues)
    const hasLots = lotGroups.some(g => g.lot !== null)
    const LOT_W = Math.max(...lotGroups.map(g => (g.lot ?? 'SANS LOT').length))
    const maj = ` · maj ${new Date(v.updatedAt).toTimeString().slice(0, 5)}`
    const cur = v.milestones.find(m => m.title === v.current)
    const byPhase: Record<string, number> = {}
    for (const i of v.issues) if (i.phase !== 'SANS PHASE') byPhase[i.phase] = (byPhase[i.phase] ?? 0) + 1
    const startedCount = Object.values(byPhase).reduce((a, b) => a + b, 0)

    return (
      <Box flexDirection="column">
        {v.error && T({ color: 'red' }, `gh: ${v.error}`)}
        {v.current ? (
          <Box flexDirection="column">
            <Text wrap="truncate-end">
              <Text bold color="cyan">{`Milestone ${v.current}`}</Text>
              {v.isReleasing && <Text bold color="yellow">{' — publication'}</Text>}
              <Text dimColor>{maj}</Text>
            </Text>
            {cur && progress(cur.closed, byPhase, v.issues.length - startedCount)}
            {lotGroups.flatMap(lg =>
              groupByPhase(lg.issues).flatMap((g, gi) =>
                g.issues.map((i, k) => (
                  <Text wrap="truncate-end">
                    {hasLots && (
                      <Text bold color={lg.lot ? hex(lg.issues.find(i => i.lotLabel)?.lotLabel ?? lg.lot, 'magenta') : 'gray'}>
                        {(gi === 0 && k === 0 ? (lg.lot ?? 'SANS LOT') : '').padEnd(LOT_W + 1)}
                      </Text>
                    )}
                    <Text bold color={phaseColor(g.phase)}>
                      {k === 0 ? g.phase.padEnd(LABEL_W) : ' '.repeat(LABEL_W)}
                    </Text>
                    <Text dimColor>{': '}</Text>
                    <Text color={i.isBlocked ? 'red' : undefined}>
                      {`${i.isBlocked ? '⛔' : ''}#${i.number} ${i.title}`}
                    </Text>
                  </Text>
                )),
              ),
            )}
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text wrap="truncate-end">
              <Text bold>Aucun milestone en cours</Text>
              <Text dimColor>{maj}</Text>
            </Text>
            {v.milestones.length === 0 && <Text dimColor>Aucun milestone ouvert.</Text>}
            {v.milestones.map(m => {
              // Une ligne par milestone : « barre  %  fermées/total  titre », le titre étant tronqué en dernier.
              const total = m.open + m.closed
              const n = total === 0 ? 0 : Math.round((m.closed / total) * 10)
              const pct = total === 0 ? 0 : Math.round((m.closed / total) * 100)
              return (
                <Text wrap="truncate-end">
                  <Text color="#a371f7">{'█'.repeat(n)}</Text>
                  <Text dimColor>{'░'.repeat(10 - n)}</Text>
                  <Text bold>{` ${String(pct).padStart(3)}%`}</Text>
                  <Text dimColor>{` ${m.closed}/${total} `}</Text>
                  <Text bold color="cyan">{m.title}</Text>
                </Text>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })
}
