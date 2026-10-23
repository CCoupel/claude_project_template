import type { Issue, MilestoneRow, Usage, View } from '../types'

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

// Milestone sans version définitive (`vX.0.x`, `vx.x.x`) : un segment du numéro est un `x`, il passe en dernier.
const isUnversioned = (title: string) =>
  title
    .split(/\s/)[0]
    .replace(/^v/i, '')
    .split('.')
    .some(seg => /^x$/i.test(seg))

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
 * À défaut : un milestone encore ouvert dont toutes les issues sont fermées (CI verte) est en publication /
 * déploiement PROD — il reste le milestone en cours (`isReleasing`), jusqu'à sa clôture.
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
  const working = sorted.find(m => started.has(m.title))?.title ?? null
  const releasing = working
    ? null
    : (sorted.find(m => m.open_issues === 0 && m.closed_issues > 0)?.title ?? null)
  const current = working ?? releasing
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
          needsHuman: i.labels.some(l => l.name === 'VALID-HUMAINE'),
        }))
    : []
  // Liste affichée quand aucun milestone n'est en cours : sans version (`x`) en dernier, puis par progression
  // décroissante, puis par version croissante.
  const pct = (m: RawMilestone) => {
    const total = m.open_issues + m.closed_issues
    return total === 0 ? 0 : m.closed_issues / total
  }
  const milestones: MilestoneRow[] = [...sorted]
    .sort(
      (a, b) =>
        Number(isUnversioned(a.title)) - Number(isUnversioned(b.title)) ||
        pct(b) - pct(a) ||
        compareTitles(a.title, b.title) ||
        a.title.localeCompare(b.title),
    )
    .map(m => ({
      title: m.title,
      open: m.open_issues,
      closed: m.closed_issues,
    }))
  return { current, isReleasing: releasing !== null, issues, milestones, colors, updatedAt: now, error: null }
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

// ---- Consommation du compte Claude (fenêtres de quota), affichée en tête du panneau ----

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

const MODELS: Record<string, string> = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', fable: 'Fable', mythos: 'Mythos' }
const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

/** Libellé court d'une fenêtre : « Session », « Semaine », « Fable sem. », « Dépense », sinon le `kind` brut. */
export function usageLabel(kind: string): string {
  const k = kind.toLowerCase()
  const model = Object.keys(MODELS).find(m => k.includes(m))
  const prefix = model ? `${MODELS[model]} ` : ''
  if (k.includes('five_hour') || k.includes('5h')) return prefix ? `${prefix}session` : 'Session'
  if (k.includes('seven_day') || k.includes('7d') || k.includes('week')) return prefix ? `${prefix}sem.` : 'Semaine'
  if (k.includes('spend')) return 'Dépense'
  return kind
}

/** Ordre d'affichage : session, semaine, puis les limites par modèle, puis le reste. */
export function usageRank(kind: string): number {
  const k = kind.toLowerCase()
  const hasModel = Object.keys(MODELS).some(m => k.includes(m))
  if (k.includes('five_hour')) return hasModel ? 2 : 0
  if (k.includes('seven_day')) return hasModel ? 3 : 1
  return 4
}

/** Fenêtres des en-têtes de la dernière réponse API (`$.session.usage().rateLimits`) : repli sans endpoint compte. */
export function buildUsage(limits: RateLimit[], now: number): Usage {
  const windows = limits
    .map(l => ({ kind: l.kind, label: usageLabel(l.kind), percentUsed: Math.max(0, l.percentUsed), resetsAt: l.resetsAt ?? null, severity: null }))
    .sort((a, b) => usageRank(a.kind) - usageRank(b.kind) || a.kind.localeCompare(b.kind))
  return { windows, source: 'headers', updatedAt: now, error: null }
}

/** Une entrée de `limits[]` de l'endpoint d'utilisation du compte (`/api/oauth/usage`). */
export type AccountLimit = {
  kind: string
  group?: string | null
  percent: number
  severity?: string | null
  resets_at?: string | null
  scope?: { model?: { id?: string | null; display_name?: string | null } | null; surface?: string | null } | null
}

const ACCOUNT_RANK: Record<string, number> = { session: 0, weekly_all: 1, weekly_scoped: 2 }

/** Libellé d'une limite du compte : « Session », « Semaine », « Fable sem. » (modèle), « <surface> sem. ». */
export function accountLabel(l: AccountLimit): string {
  if (l.kind === 'session') return 'Session'
  if (l.kind === 'weekly_all') return 'Semaine'
  const scope = l.scope?.model?.display_name ?? l.scope?.model?.id ?? l.scope?.surface ?? null
  if (l.kind === 'weekly_scoped' || l.group === 'weekly') return scope ? `${scope} sem.` : 'Semaine (autre)'
  return scope ? `${scope} ${l.kind}` : l.kind
}

/**
 * Fenêtres de l'endpoint d'utilisation du compte — la même source que la page « Utilisation » du site :
 * session, semaine toutes limites, et les limites hebdomadaires distinctes par modèle (ex. Fable).
 * Retourne null si la réponse n'a pas de tableau `limits` exploitable.
 */
export function parseAccountUsage(json: unknown, now: number): Usage | null {
  const limits = (json as { limits?: unknown } | null)?.limits
  if (!Array.isArray(limits)) return null
  const windows = (limits as AccountLimit[])
    .filter(l => l && typeof l.kind === 'string' && typeof l.percent === 'number')
    .map(l => ({
      kind: l.kind,
      label: accountLabel(l),
      percentUsed: Math.max(0, l.percent),
      resetsAt: l.resets_at ?? null,
      severity: l.severity ?? null,
    }))
    .sort((a, b) => (ACCOUNT_RANK[a.kind] ?? 9) - (ACCOUNT_RANK[b.kind] ?? 9) || a.label.localeCompare(b.label))
  return { windows, source: 'account', updatedAt: now, error: null }
}

/**
 * Échec passager de l'endpoint du compte alors qu'on a déjà ses fenêtres : on les garde (la limite par modèle n'existe
 * nulle part ailleurs), en rafraîchissant session et semaine depuis les en-têtes de la dernière réponse quand elles y sont.
 */
export function mergeHeaders(prev: Usage, limits: RateLimit[], now: number, error: string): Usage {
  const byKind: Record<string, RateLimit | undefined> = {
    session: limits.find(l => l.kind === 'five_hour'),
    weekly_all: limits.find(l => l.kind === 'seven_day'),
  }
  const windows = prev.windows.map(w => {
    const h = byKind[w.kind]
    return h ? { ...w, percentUsed: Math.max(0, h.percentUsed), resetsAt: h.resetsAt ?? w.resetsAt } : w
  })
  return { ...prev, windows, updatedAt: now, error }
}

/**
 * Cache de consommation partagé avec le launcher (CCoupel/Claude-Launcher) et les autres projets :
 * réponse brute de `/api/oauth/usage`, sa date de modification faisant foi ; `<cache>.err` (non vide) = dernier échec.
 */
export function usageCachePath(xdgCacheHome: string | undefined, home: string | undefined): string | null {
  const base = xdgCacheHome || (home ? `${home}/.cache` : '')
  return base ? `${base}/claude-launcher/usage.json` : null
}

/**
 * Qui appelle l'endpoint : personne tant que le cache a moins de `freshMs` (le launcher le relit toutes les 60 s),
 * ni moins de `backoffMs` après un échec enregistré par quiconque (429, token expiré) ; sinon cette session.
 */
export function usageCacheDecision(
  cacheMtime: number | null,
  errMtime: number | null,
  now: number,
  freshMs: number,
  backoffMs: number,
): 'cache' | 'backoff' | 'fetch' {
  if (cacheMtime !== null && now - cacheMtime < freshMs) return 'cache'
  if (errMtime !== null && now - errMtime < backoffMs) return 'backoff'
  return 'fetch'
}

/** Repli quand la config du launcher est absente ou illisible : intervalle de lecture supposé de 5 min. */
export const USAGE_REFRESH_FALLBACK_SEC = 300

/**
 * `USAGE_REFRESH_SEC` de `~/.config/claude-launcher.conf` (fichier bash : dernière affectation non commentée,
 * guillemets tolérés), borné à 60 s minimum ; `null` si absent ou non numérique.
 */
export function parseUsageRefreshSec(conf: string | null | undefined): number | null {
  if (!conf) return null
  const m = [...conf.matchAll(/^\s*USAGE_REFRESH_SEC=["']?(\d+)["']?\s*(?:#.*)?$/gm)].pop()
  return m ? Math.max(60, Number(m[1])) : null
}

/** Seuils dérivés de l'intervalle du launcher : cache frais sous 1,5 × l'intervalle, pause d'au moins 5 min après un échec. */
export function usageThresholds(refreshSec: number | null): { freshMs: number; backoffMs: number } {
  const sec = refreshSec ?? USAGE_REFRESH_FALLBACK_SEC
  return { freshMs: sec * 1500, backoffMs: Math.max(300, sec * 2) * 1000 }
}

const two = (n: number) => String(n).padStart(2, '0')

/** Réinitialisation en forme courte : « 15:00 » le jour même, « demain 12:00 », « mer. 12:00 », « 42 min ». Heure locale. */
export function formatReset(resetsAt: string | null, now: number): string {
  if (!resetsAt) return ''
  const t = new Date(resetsAt)
  if (Number.isNaN(t.getTime())) return ''
  const diffMin = Math.round((t.getTime() - now) / 60_000)
  if (diffMin <= 0) return 'imminent'
  if (diffMin < 60) return `${diffMin} min`
  const d = new Date(now)
  const hm = `${two(t.getHours())}:${two(t.getMinutes())}`
  const dayOf = (x: Date) => x.getFullYear() * 10_000 + x.getMonth() * 100 + x.getDate()
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  if (dayOf(t) === dayOf(d)) return hm
  if (dayOf(t) === dayOf(tomorrow)) return `demain ${hm}`
  return `${DAYS_SHORT[t.getDay()]} ${hm}`
}

/** Couleur de la barre de consommation : bleu, orange au-delà du seuil, rouge à partir de 90 %. */
export function usageColor(percent: number, warnPercent: number, severity: string | null = null): string {
  if (severity === 'critical' || percent >= 90) return 'red'
  if (severity === 'warning' || percent >= warnPercent) return 'yellow'
  return 'blue'
}

/** Barre « ████░░░░ » de `width` cellules pour `percent` (0-100, borné). */
export function usageBar(percent: number, width: number): { filled: number; empty: number } {
  const p = Math.min(100, Math.max(0, percent))
  const filled = Math.round((p / 100) * width)
  return { filled, empty: width - filled }
}

/**
 * Session de teammate (spawn par le team-leader, teammateMode tmux) : variables d'environnement d'agent posées,
 * ou un ancêtre du processus portant --agent-id/--agent-name/--team-name/--parent-session-id. Les shells
 * intermédiaires (`sh -c`, `bash -c`) sont ignorés : leur commande pourrait citer ces options sans être un agent.
 */
export const isTeammateSession = (env: Array<string | undefined>, cmdlines: string) =>
  env.some(v => !!v) ||
  cmdlines
    .split('\n')
    .filter(l => !/^(\/bin\/)?(ba)?sh -c /.test(l))
    .some(l => /(^|\s)--(agent-id|agent-name|team-name|parent-session-id)(\s|=|$)/.test(l))
