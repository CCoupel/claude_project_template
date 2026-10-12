import type { Issue, MilestoneRow, View } from '../types'

export const PHASES = ['PLANNING', 'PRET', 'EN COURS', 'EN REVIEW', 'EN QA', 'DONE'] as const

type RawIssue = {
  number: number
  title: string
  labels: { name: string }[]
  milestone: { title: string } | null
}
type RawMilestone = {
  title: string
  due_on: string | null
  open_issues: number
  closed_issues: number
}

const semver = (title: string) =>
  title
    .replace(/^v/i, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0)

const compareTitles = (a: string, b: string) => {
  const x = semver(a)
  const y = semver(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const compareMilestones = (a: RawMilestone, b: RawMilestone) => {
  if (a.due_on && b.due_on && a.due_on !== b.due_on) return a.due_on < b.due_on ? -1 : 1
  if (a.due_on && !b.due_on) return -1
  if (!a.due_on && b.due_on) return 1
  return compareTitles(a.title, b.title)
}

const lotLabelOf = (i: RawIssue) => i.labels.map(l => l.name).find(n => /^LOT-\d+(\.\d+)?$/i.test(n)) ?? null

// Regroupement par lot : un sous-lot (`LOT-2.1`) appartient au lot parent (`LOT-2`), sans distinction.
const lotOf = (i: RawIssue) => lotLabelOf(i)?.replace(/\.\d+$/, '') ?? null

const phaseOf = (i: RawIssue) =>
  i.labels.map(l => l.name).find(n => (PHASES as readonly string[]).includes(n)) ?? null

/**
 * Milestone en cours = le premier milestone ouvert (échéance, puis SemVer)
 * qui porte au moins une issue ouverte avec un label de phase.
 */
export const buildView = (
  rawMilestones: RawMilestone[],
  rawIssues: RawIssue[],
  now: number,
  colors: Record<string, string> = {},
): View => {
  const sorted = [...rawMilestones].sort(compareMilestones)
  const started = new Set(
    rawIssues.filter(i => i.milestone && phaseOf(i)).map(i => i.milestone!.title),
  )
  const current = sorted.find(m => started.has(m.title))?.title ?? null
  const issues: Issue[] = current
    ? rawIssues
        .filter(i => i.milestone?.title === current)
        .map(i => ({
          number: i.number,
          title: i.title,
          phase: phaseOf(i) ?? 'SANS PHASE',
          lot: lotOf(i),
          lotLabel: lotLabelOf(i),
          isBlocked: i.labels.some(l => l.name === 'BLOQUE'),
        }))
    : []
  const milestones: MilestoneRow[] = sorted.map(m => ({
    title: m.title,
    open: m.open_issues,
    closed: m.closed_issues,
  }))
  return { current, issues, milestones, colors, updatedAt: now, error: null }
}

export const groupByPhase = (issues: Issue[]) =>
  // Du plus avancé au moins avancé, le backlog (sans phase) en dernier.
  [...PHASES].reverse().concat('SANS PHASE' as never)
    .map(phase => ({ phase, issues: issues.filter(i => i.phase === phase) }))
    .filter(g => g.issues.length > 0)

/**
 * Issues regroupées par lot (`LOT-N`) : lots les plus avancés d'abord (avancement moyen de leurs issues :
 * DONE, EN QA, EN REVIEW, EN COURS, PRET, PLANNING, sans phase), puis les issues sans lot.
 * Sans aucun lot dans le milestone : un seul groupe `lot: null`, aucun intitulé à afficher.
 */
export const groupByLot = (issues: Issue[]) => {
  const num = (l: string) => parseInt(l.slice(4), 10)
  const lots = [...new Set(issues.map(i => i.lot).filter((l): l is string => !!l))]
  if (lots.length === 0) return [{ lot: null as string | null, issues }]
  // Avancement : phase moyenne des issues du lot (un lot entièrement DONE passe avant un lot DONE + EN REVIEW),
  // puis phase la plus avancée, puis numéro croissant.
  const rank = (phase: string) => (PHASES as readonly string[]).indexOf(phase) + 1 // 0 = sans phase
  const stats = (l: string) => {
    const ranks = issues.filter(i => i.lot === l).map(i => rank(i.phase))
    return { best: Math.max(...ranks), avg: ranks.reduce((a, b) => a + b, 0) / ranks.length }
  }
  lots.sort((a, b) => {
    const x = stats(a)
    const y = stats(b)
    return y.avg - x.avg || y.best - x.best || num(a) - num(b)
  })
  const groups: { lot: string | null; issues: Issue[] }[] = lots.map(lot => ({
    lot,
    issues: issues.filter(i => i.lot === lot),
  }))
  const rest = issues.filter(i => !i.lot)
  return rest.length > 0 ? [...groups, { lot: null, issues: rest }] : groups
}

/**
 * Répartit `width` cellules entre des effectifs, proportionnellement (plus fort reste) ;
 * tout effectif non nul garde au moins une cellule. Somme = `width` si le total est non nul.
 */
export const allocate = (counts: number[], width: number) => {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map(c => (c / total) * width)
  const cells = exact.map(Math.floor)
  let left = width - cells.reduce((a, b) => a + b, 0)
  exact
    .map((x, k) => ({ k, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r)
    .forEach(({ k }) => {
      if (left > 0) {
        cells[k] += 1
        left -= 1
      }
    })
  counts.forEach((c, k) => {
    if (c > 0 && cells[k] === 0) {
      const big = cells.indexOf(Math.max(...cells))
      cells[big] -= 1
      cells[k] = 1
    }
  })
  return cells
}

/** Étiquettes de phase visées par une commande `gh issue edit/close/...`. */
export type Expectation = { number: number; label: string | null; isClosed: boolean }

export const parseGhIssueCommand = (command: string): Expectation[] => {
  const out: Expectation[] = []
  for (const part of command.split(/&&|;|\n/)) {
    const m = part.match(/\bgh\s+issue\s+(edit|close|reopen|create)\b\s*(\d+)?/)
    if (!m) continue
    const number = m[2] ? parseInt(m[2], 10) : 0
    const add = part.match(/--add-label\s+(?:"([^"]+)"|'([^']+)'|(\S+))/)
    const label = add ? (add[1] ?? add[2] ?? add[3]) : null
    out.push({
      number,
      label: label && (PHASES as readonly string[]).includes(label) ? label : null,
      isClosed: m[1] === 'close',
    })
  }
  return out
}

/** Vrai si la vue reflète toutes les attentes (issues closes absentes, label posé). */
export const isConsistent = (rawIssues: RawIssue[], expected: Expectation[]) =>
  expected.every(e => {
    if (e.number === 0) return true
    const issue = rawIssues.find(i => i.number === e.number)
    if (e.isClosed) return !issue
    if (!e.label) return true
    return !issue || issue.labels.some(l => l.name === e.label)
  })

/** Vrai si la session est celle d'un teammate : variable d'env ou flag de lancement (`--agent-id`...). */
export const isTeammateSession = (env: Array<string | undefined>, cmdline: string) =>
  env.some(v => !!v) || /(^|\s)--(agent-id|agent-name|team-name|parent-session-id)(\s|=|$)/.test(cmdline)
