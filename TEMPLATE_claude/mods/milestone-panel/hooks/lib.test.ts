import { test, expect } from 'claude-code/testing'

import { buildView, groupByPhase, isConsistent, parseGhIssueCommand } from './lib'

const lab = (...names: string[]) => names.map(name => ({ name }))
const ms = [
  { title: 'v1.3.0', due_on: null, open_issues: 2, closed_issues: 1 },
  { title: 'v1.2.0', due_on: null, open_issues: 1, closed_issues: 3 },
]

test('milestone en cours = premier milestone avec une issue en phase', () => {
  const issues = [
    { number: 1, title: 'a', labels: lab('EN COURS', 'BLOQUE'), milestone: { title: 'v1.3.0' } },
    { number: 2, title: 'b', labels: lab('PLANNING'), milestone: { title: 'v1.3.0' } },
    { number: 3, title: 'c', labels: lab('feature'), milestone: { title: 'v1.2.0' } },
  ]
  const v = buildView(ms, issues, 1)
  expect(v.current).toBe('v1.3.0')
  expect(groupByPhase(v.issues).map(g => g.phase)).toEqual(['PLANNING', 'EN COURS'])
  expect(v.issues.find(i => i.number === 1)?.isBlocked).toBe(true)
})

test('aucun milestone en cours : liste des milestones triés SemVer', () => {
  const v = buildView(ms, [], 1)
  expect(v.current).toBe(null)
  expect(v.milestones.map(m => m.title)).toEqual(['v1.2.0', 'v1.3.0'])
})

test('commande gh issue edit : attentes et cohérence', () => {
  const exp = parseGhIssueCommand(
    'gh issue edit 12 --add-label "EN QA" --remove-label "EN REVIEW" && gh issue close 13',
  )
  expect(exp).toEqual([
    { number: 12, label: 'EN QA', isClosed: false },
    { number: 13, label: null, isClosed: true },
  ])
  const stale = [{ number: 12, title: 'x', labels: lab('EN REVIEW'), milestone: null }]
  expect(isConsistent(stale, exp)).toBe(false)
  const fresh = [{ number: 12, title: 'x', labels: lab('EN QA'), milestone: null }]
  expect(isConsistent(fresh, exp)).toBe(true)
})
