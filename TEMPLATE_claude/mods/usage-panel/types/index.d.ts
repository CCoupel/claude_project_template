export type Window = {
  /** Fenêtre telle que rapportée par l'API (`five_hour`, `seven_day`, `seven_day_opus`, `spend_limit`…). */
  kind: string
  /** Libellé affiché (« Session actuelle », « Cette semaine », « Fable cette semaine »…). */
  label: string
  /** 0 à 100 (au-delà sur un plafond de dépense dépassé). */
  percentUsed: number
  /** Réinitialisation, ISO 8601 ; absent quand l'API ne la donne pas. */
  resetsAt: string | null
}
export type View = {
  windows: Window[]
  /** Coût de la session en USD, absent sans registre de coût. */
  costUsd: number | null
  /** Dernière mesure reçue (ms), 0 avant la première. */
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'usage-panel': { view: View }
  }
}
