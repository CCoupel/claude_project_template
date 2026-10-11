export type Issue = { number: number; title: string; phase: string; isBlocked: boolean }
export type MilestoneRow = { title: string; open: number; closed: number }
export type View = {
  /** Milestone en cours, ou null quand aucun n'a d'issue en phase. */
  current: string | null
  issues: Issue[]
  milestones: MilestoneRow[]
  updatedAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'milestone-panel': { view: View }
  }
}
