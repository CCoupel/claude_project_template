import { test, expect } from 'claude-code/testing'

import { allocate, buildView, groupByLot, groupByPhase, isConsistent, isTeammateSession, parseGhIssueCommand } from './lib'

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
  expect(groupByPhase(v.issues).map(g => g.phase)).toEqual(['EN COURS', 'PLANNING'])
  expect(v.issues.find(i => i.number === 1)?.isBlocked).toBe(true)
})

test('aucun milestone en cours : liste triée par progression puis par version', () => {
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

test('session teammate détectée par env ou flags, pas le team-leader', () => {
  expect(isTeammateSession([undefined, undefined], 'claude --dangerously-skip-permissions')).toBe(false)
  expect(isTeammateSession(['dev-backend@team'], 'claude')).toBe(true)
  expect(isTeammateSession([], 'claude --agent-id x@t --team-name t')).toBe(true)
})

test('regroupement par lot : triés par avancement, sans lot en dernier ; sans lot = un groupe nu', () => {
  const issues = [
    { number: 1, title: 'a', labels: lab('LOT-10', 'EN COURS'), milestone: { title: 'v1' } },
    { number: 2, title: 'b', labels: lab('LOT-2'), milestone: { title: 'v1' } },
    { number: 3, title: 'c', labels: lab('PLANNING'), milestone: { title: 'v1' } },
    { number: 4, title: 'd', labels: lab('LOT-3'), milestone: { title: 'v1' } },
    { number: 5, title: 'e', labels: lab('LOT-4', 'PLANNING'), milestone: { title: 'v1' } },
  ]
  const v = buildView([{ title: 'v1', due_on: null, open_issues: 5, closed_issues: 0 }], issues, 0)
  expect(groupByLot(v.issues).map(g => g.lot)).toEqual(['LOT-10', 'LOT-4', 'LOT-2', 'LOT-3', null])
  const plain = buildView([{ title: 'v1', due_on: null, open_issues: 1, closed_issues: 0 }], [issues[2]], 0)
  expect(groupByLot(plain.issues)).toHaveLength(1)
  expect(groupByLot(plain.issues)[0].lot).toBeNull()
})

test('allocate : somme = largeur, effectif non nul garde une cellule, ordre conservé', () => {
  const c = allocate([0, 1, 1, 7, 0], 20)
  expect(c.reduce((a, b) => a + b, 0)).toBe(20)
  expect(c[1]).toBeGreaterThan(0)
  expect(c[0]).toBe(0)
  expect(allocate([0, 0], 10)).toEqual([0, 0])
  expect(allocate([1, 99], 8).every((x, k) => (k === 0 ? x >= 1 : true))).toBe(true)
})

test('lots triés par avancement et non par numéro', () => {
  const m = { title: 'v1' }
  const issues = [
    { number: 1, title: 'a', labels: lab('LOT-1', 'EN COURS'), milestone: m },
    { number: 2, title: 'b', labels: lab('LOT-2', 'DONE'), milestone: m },
    { number: 3, title: 'c', labels: lab('LOT-3', 'EN REVIEW'), milestone: m },
    { number: 4, title: 'd', labels: lab('LOT-4', 'DONE'), milestone: m },
    { number: 5, title: 'e', labels: lab('LOT-4'), milestone: m },
  ]
  const v = buildView([{ title: 'v1', due_on: null, open_issues: 5, closed_issues: 0 }], issues, 0)
  expect(groupByLot(v.issues).map(g => g.lot)).toEqual(['LOT-2', 'LOT-3', 'LOT-4', 'LOT-1'])
})

test('PRET est une phase : classée entre PLANNING et EN COURS', () => {
  const m = { title: 'v1' }
  const issues = [
    { number: 1, title: 'a', labels: lab('LOT-1', 'PLANNING'), milestone: m },
    { number: 2, title: 'b', labels: lab('LOT-2', 'PRET'), milestone: m },
    { number: 3, title: 'c', labels: lab('LOT-3', 'EN COURS'), milestone: m },
  ]
  const v = buildView([{ title: 'v1', due_on: null, open_issues: 3, closed_issues: 0 }], issues, 0)
  expect(v.issues.map(i => i.phase)).toEqual(['PLANNING', 'PRET', 'EN COURS'])
  expect(groupByLot(v.issues).map(g => g.lot)).toEqual(['LOT-3', 'LOT-2', 'LOT-1'])
  expect(groupByPhase(v.issues).map(g => g.phase)).toEqual(['EN COURS', 'PRET', 'PLANNING'])
})

test('sous-lots LOT-x.y : regroupés sous le lot parent, sans distinction', () => {
  const m = { title: 'v1' }
  const issues = [
    { number: 1, title: 'a', labels: lab('LOT-2.1', 'EN COURS'), milestone: m },
    { number: 2, title: 'b', labels: lab('LOT-2.2', 'PRET'), milestone: m },
    { number: 3, title: 'c', labels: lab('LOT-1'), milestone: m },
  ]
  const v = buildView([{ title: 'v1', due_on: null, open_issues: 3, closed_issues: 0 }], issues, 0)
  const groups = groupByLot(v.issues)
  expect(groups.map(g => g.lot)).toEqual(['LOT-2', 'LOT-1'])
  expect(groups[0].issues.map(i => i.number)).toEqual([1, 2])
  expect(v.issues[0].lotLabel).toBe('LOT-2.1')
})

test('un lot entièrement DONE passe avant un lot DONE + EN REVIEW', () => {
  const m = { title: 'v1' }
  const issues = [
    { number: 1, title: 'a', labels: lab('LOT-2', 'DONE'), milestone: m },
    { number: 2, title: 'b', labels: lab('LOT-2', 'EN REVIEW'), milestone: m },
    { number: 3, title: 'c', labels: lab('LOT-4', 'DONE'), milestone: m },
    { number: 4, title: 'd', labels: lab('LOT-4', 'DONE'), milestone: m },
    { number: 5, title: 'e', labels: lab('LOT-1', 'DONE'), milestone: m },
    { number: 6, title: 'f', labels: lab('LOT-6', 'EN QA'), milestone: m },
  ]
  const v = buildView([{ title: 'v1', due_on: null, open_issues: 6, closed_issues: 0 }], issues, 0)
  expect(groupByLot(v.issues).map(g => g.lot)).toEqual(['LOT-1', 'LOT-4', 'LOT-2', 'LOT-6'])
})

test('liste des milestones : sans version (x) en dernier, puis progression décroissante, puis version croissante', () => {
  const m = (title: string, open: number, closed: number) => ({ title, due_on: null, open_issues: open, closed_issues: closed })
  const v = buildView(
    [m('v11.3', 3, 0), m('v11.2.2', 4, 0), m('v11.2.1', 0, 8), m('vX.0.x', 1, 0), m('v12.0', 2, 2)],
    [],
    1,
  )
  expect(v.milestones.map(x => x.title)).toEqual(['v11.2.1', 'v12.0', 'v11.2.2', 'v11.3', 'vX.0.x'])
})

test('milestones sans version (vX.0.x, vx.x.x) en dernier, même avec une progression plus haute', () => {
  const m = (title: string, open: number, closed: number) => ({ title, due_on: null, open_issues: open, closed_issues: closed })
  const v = buildView(
    [m('vX.0.x — DNS', 0, 5), m('vx.x.x — Scoring', 1, 1), m('v11.3 — Ambiance', 3, 0), m('v11.2.2', 4, 0)],
    [],
    1,
  )
  expect(v.milestones.map(x => x.title)).toEqual(['v11.2.2', 'v11.3 — Ambiance', 'vX.0.x — DNS', 'vx.x.x — Scoring'])
})
