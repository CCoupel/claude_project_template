export type Issue = { number: number; title: string; phase: string; /** Lot parent (`LOT-2` pour `LOT-2` ou `LOT-2.1`). */ lot: string | null; /** Label de lot tel que posé sur l'issue (couleur GitHub). */ lotLabel: string | null; isBlocked: boolean; /** Label `VALID-HUMAINE` : validation humaine requise. */ needsHuman: boolean }
export type MilestoneRow = { title: string; open: number; closed: number }
/** Pull request ouverte, affichée quand aucun milestone n'est en cours. */
export type PullRow = {
  number: number
  title: string
  branch: string
  isDraft: boolean
  /** Décision de revue GitHub : `APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, ou null. */
  review: string | null
}
export type View = {
  /** Milestone en cours, ou null quand aucun n'a d'issue en phase. */
  current: string | null
  /** Vrai quand le milestone en cours n'a plus d'issue ouverte : publication / déploiement PROD en cours. */
  isReleasing: boolean
  /** État du milestone en cours (ligne `**Etat** :` de sa description, GITHUB.md 3.0bis), ex. `⏸ a publier` ; absent sinon. */
  state?: string | null
  issues: Issue[]
  milestones: MilestoneRow[]
  /** PR ouvertes, lues seulement quand aucun milestone n'est en cours (vide sinon). */
  prs: PullRow[]
  /** Couleur GitHub (hex sans #) de chaque label du dépôt. */
  colors: Record<string, string>
  updatedAt: number
  error: string | null
}

export type UsageWindow = {
  /** Fenêtre telle que rapportée (`session`, `weekly_all`, `weekly_scoped` ; ou `five_hour`, `seven_day` via les en-têtes). */
  kind: string
  /** Libellé court affiché : « Session », « Semaine », « Fable sem. »… */
  label: string
  /** 0 à 100 (au-delà sur un plafond de dépense dépassé). */
  percentUsed: number
  /** Réinitialisation, ISO 8601 ; absent quand l'API ne la donne pas. */
  resetsAt: string | null
  /** Gravité rapportée par l'endpoint d'utilisation (`normal`, `warning`, `critical`), null via les en-têtes. */
  severity: string | null
}
export type Usage = {
  windows: UsageWindow[]
  /** `account` : endpoint d'utilisation du compte (toutes les limites, dont par modèle) ; `headers` : en-têtes de la dernière réponse. */
  source: 'account' | 'headers' | null
  /** Dernière mesure reçue (ms), 0 avant la première. */
  updatedAt: number
  /** Dernier échec de lecture de l'endpoint du compte (les valeurs affichées datent alors de la lecture précédente), null sinon. */
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'milestone-panel': { view: View; usage: Usage }
  }
}
