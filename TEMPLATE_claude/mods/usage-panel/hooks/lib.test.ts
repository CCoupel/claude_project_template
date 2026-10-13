import { test, expect } from 'claude-code/testing'

import { bar, buildView, colorOf, formatReset, labelOf } from './lib'

test('libellés et ordre des fenêtres', () => {
  const v = buildView(
    [
      { kind: 'seven_day_fable', percentUsed: 17, resetsAt: '2026-10-14T10:00:00Z' },
      { kind: 'seven_day', percentUsed: 95, resetsAt: '2026-10-14T10:00:00Z' },
      { kind: 'five_hour', percentUsed: 53.4, resetsAt: '2026-10-13T13:00:00Z' },
    ],
    1.5,
    1_000,
  )
  expect(v.windows.map(w => w.label)).toEqual(['Session actuelle', 'Cette semaine', 'Fable cette semaine'])
  expect(v.costUsd).toBe(1.5)
  expect(labelOf('spend_limit')).toBe('Plafond de dépense')
  expect(labelOf('inconnu')).toBe('inconnu')
})

test('heure de réinitialisation : même jour, demain, autre jour, moins d’une heure', () => {
  const now = new Date(2026, 9, 13, 11, 30).getTime() // mardi 13 octobre 2026, 11:30 locale
  expect(formatReset(new Date(2026, 9, 13, 15, 0).toISOString(), now)).toBe('Réinitialisation à 15:00')
  expect(formatReset(new Date(2026, 9, 14, 12, 0).toISOString(), now)).toBe('Réinitialisation demain 12:00')
  expect(formatReset(new Date(2026, 9, 15, 12, 0).toISOString(), now)).toBe('Réinitialisation le jeudi 12:00')
  expect(formatReset(new Date(2026, 9, 13, 12, 12).toISOString(), now)).toBe('Réinitialisation dans 42 min')
  expect(formatReset(null, now)).toBe('')
})

test('couleur et barre', () => {
  expect(colorOf(53, 70)).toBe('blue')
  expect(colorOf(75, 70)).toBe('yellow')
  expect(colorOf(95, 70)).toBe('red')
  expect(bar(50, 20)).toEqual({ filled: 10, empty: 10 })
  expect(bar(130, 20)).toEqual({ filled: 20, empty: 0 })
})
