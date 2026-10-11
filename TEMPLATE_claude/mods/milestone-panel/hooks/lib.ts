import type { Issue, MilestoneRow, View } from '../types'

export const PHASES = ['PLANNING', 'EN COURS', 'EN REVIEW', 'EN QA', 'DONE'] as const

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
          isBlocked: i.labels.some(l => l.name === 'BLOQUE'),
        }))
    : []
  const milestones: MilestoneRow[] = sorted.map(m => ({
    title: m.title,
    open: m.open_issues,
    closed: m.closed_issues,
  }))
  return { current, issues, milestones, updatedAt: now, error: null }
}

export const groupByPhase = (issues: Issue[]) =>
  [...PHASES, 'SANS PHASE']
    .map(phase => ({ phase, issues: issues.filter(i => i.phase === phase) }))
    .filter(g => g.issues.length > 0)

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
