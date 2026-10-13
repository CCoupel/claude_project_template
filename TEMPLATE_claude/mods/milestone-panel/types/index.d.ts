export type Issue = { number: number; title: string; phase: string; /** Lot parent (`LOT-2` pour `LOT-2` ou `LOT-2.1`). */ lot: string | null; /** Label de lot tel que posé sur l'issue (couleur GitHub). */ lotLabel: string | null; isBlocked: boolean }
export type MilestoneRow = { title: string; open: number; closed: number }
export type View = {
  /** Milestone en cours, ou null quand aucun n'a d'issue en phase. */
  current: string | null
  /** Vrai quand le milestone en cours n'a plus d'issue ouverte : publication / déploiement PROD en cours. */
  isReleasing: boolean
  issues: Issue[]
  milestones: MilestoneRow[]
  /** Couleur GitHub (hex sans #) de chaque label du dépôt. */
  colors: Record<string, string>
  updatedAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'milestone-panel': { view: View }
  }
}
