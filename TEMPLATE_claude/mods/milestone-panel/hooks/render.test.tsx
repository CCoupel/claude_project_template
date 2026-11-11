import { expect, test } from 'claude-code/testing'

import { buildView } from './lib'

const lab = (...names: string[]) => names.map(name => ({ name }))
const m = { title: 'v2.3.0' }
const VIEW = buildView(
  [{ title: 'v2.3.0', due_on: '2026-11-01', open_issues: 4, closed_issues: 2 }],
  [
    { number: 18, title: 'Export CSV backend', labels: lab('LOT-2.1', 'EN QA'), milestone: m },
    { number: 21, title: 'Encodage UTF-8', labels: lab('LOT-2.1', 'EN QA', 'BLOQUE'), milestone: m },
    { number: 20, title: "Bouton d'export", labels: lab('LOT-2.1', 'EN COURS'), milestone: m },
    { number: 19, title: 'Génération PDF', labels: lab('LOT-2.2', 'PRET'), milestone: m },
  ],
  0,
  {},
  [
    { number: 12, title: 'Login OAuth', labels: lab('LOT-1', 'DONE'), milestone: m },
    { number: 15, title: 'Session persistante', labels: lab('LOT-1'), milestone: m },
  ],
  { 'LOT-1': 'Authentification', 'LOT-2': 'Export des données', 'LOT-2.1': 'Export CSV', 'LOT-2.2': 'Export PDF' },
)
VIEW.updatedAt = 1

const PANE = {
  plugin: 'milestone-panel',
  component: 'Pane',
  requestId: 'milestone-panel',
  surface: 'terminal',
  props: { title: 'Milestone', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

test('arbre : lot en cours déplié jusqu’à ses issues groupées par état, le reste replié ; clic = déplier / replier', async ($, on) => {
  // Vue seedée (lecture GitHub simulée) ; le reste de l'état (dépliage) passe par l'hôte.
  on('state.get', (_, e, next) => (e.key === 'view' ? { value: { value: VIEW, version: 1 } } : next(e)))
  on('clock.now', () => ({ value: 0 }))

  const ui = await $.ui.mount(PANE)
  const text = async (re: RegExp) => (await ui.find({ type: 'Text', text: re }))?.text ?? null

  expect(await text(/LOT-2\.1 en cours/)).not.toBe(null)
  expect(await ui.find({ key: 'lot:LOT-1' })).not.toBe(undefined)
  const lot2 = (await ui.find({ key: 'lot:LOT-2' }))?.text ?? ''
  expect(lot2).toContain('▾')
  expect(lot2).toContain('Export des données')
  expect(lot2).toContain('0/4')
  const sub21 = await ui.find({ key: 'lot:LOT-2.1' })
  expect(sub21?.text).toContain('2.1')
  expect(sub21?.text).toContain('Export CSV')
  expect((await ui.find({ key: 'lot:LOT-1' }))?.text).toContain('2/2')
  expect((await ui.find({ key: 'lot:LOT-2.2' }))?.text).toContain('▸')
  // Issues de 2.1 groupées par état, l'état sur la première ligne du groupe seulement.
  expect(await text(/EN QA\s+: #18/)).not.toBe(null)
  expect(await text(/^\s+: ⛔#21/)).not.toBe(null)
  expect(await text(/EN COURS\s+: #20/)).not.toBe(null)
  expect(await text(/#19/)).toBe(null)
  expect(await text(/#12/)).toBe(null)

  await ui.press({ key: 'lot:LOT-1' })
  expect(await text(/FERMÉE\s+: #12/)).not.toBe(null)
  await ui.press({ key: 'lot:LOT-2' })
  expect(await text(/#18/)).toBe(null)
  expect(await ui.find({ key: 'lot:LOT-2.1' })).toBe(undefined)
  await ui.unmount()
})

test('aucun milestone en cours : chaque milestone se déplie au clic sur ses issues (arbre de lots s’il en porte)', async ($, on) => {
  const LIST = buildView(
    [
      { title: 'v12.0 — Roue', due_on: null, open_issues: 2, closed_issues: 0 },
      { title: 'v13.0 — Pictionary', due_on: null, open_issues: 2, closed_issues: 1 },
    ],
    [
      { number: 1, title: 'Roue de base', labels: lab('PLANNING'), milestone: { title: 'v12.0 — Roue' } },
      { number: 2, title: 'Animations', labels: lab(), milestone: { title: 'v12.0 — Roue' } },
      { number: 3, title: 'Dessin', labels: lab('PLANNING', 'LOT-1'), milestone: { title: 'v13.0 — Pictionary' } },
      { number: 4, title: 'Scores', labels: lab('PLANNING', 'LOT-2'), milestone: { title: 'v13.0 — Pictionary' } },
    ],
    0,
  )
  LIST.updatedAt = 1
  on('state.get', (_, e, next) => (e.key === 'view' ? { value: { value: LIST, version: 1 } } : next(e)))
  on('clock.now', () => ({ value: 0 }))
  const ui = await $.ui.mount(PANE)
  const text = async (re: RegExp) => (await ui.find({ type: 'Text', text: re }))?.text ?? null

  expect(LIST.current).toBe(null)
  expect((await ui.find({ key: 'ms:v12.0 — Roue' }))?.text).toContain('▸')
  expect(await text(/#1 Roue de base/)).toBe(null)

  await ui.press({ key: 'ms:v12.0 — Roue' })
  expect((await ui.find({ key: 'ms:v12.0 — Roue' }))?.text).toContain('▾')
  expect(await text(/PLANNING\s+: #1 Roue de base/)).not.toBe(null)
  expect(await text(/SANS ÉTAT\s+: #2 Animations/)).not.toBe(null)

  await ui.press({ key: 'ms:v13.0 — Pictionary' })
  expect(await ui.find({ key: 'lot:v13.0 — Pictionary|LOT-1' })).not.toBe(undefined)
  expect(await text(/PLANNING\s+: #3 Dessin/)).not.toBe(null)
  expect(await text(/#4 Scores/)).toBe(null)
  await ui.press({ key: 'lot:v13.0 — Pictionary|LOT-2' })
  expect(await text(/PLANNING\s+: #4 Scores/)).not.toBe(null)

  await ui.press({ key: 'ms:v12.0 — Roue' })
  expect(await text(/#1 Roue de base/)).toBe(null)
  await ui.unmount()
})
