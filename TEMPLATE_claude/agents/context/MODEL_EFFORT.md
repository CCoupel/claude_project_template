# MODEL_EFFORT.md — Modèle et effort des agents

> Extrait de `TEAMMATES_PROTOCOL.md` (numérotation conservée) : lu par **celui qui spawne** (le teamleader,
> `/start-session`, `/secu`, `/marketing`) et par `/init-project` — jamais par un teammate pour faire sa tâche.

## 7. Modèle et effort — résolution au spawn

Chaque agent, teamleader compris, a un `model:` et un `effort:` dans le frontmatter de son `<nom>.template.md` :
c'est la **valeur par défaut du template**. Un compagnon `<nom>.md` peut commencer par un frontmatter ne contenant
que `model:` et/ou `effort:` pour la **surcharger** (toute autre clé y est ignorée). Résolution, par priorité :

1. frontmatter du compagnon `<nom>.md` (instance générique : `generic.<nom>.md`, puis `generic.md`) ;
2. frontmatter du template `<nom>.template.md`.

**Au spawn**, celui qui spawne (le teamleader, seul à le faire) lit ces frontmatters et passe les valeurs résolues
**explicitement** à l'outil : `Task({ name, subagent_type: "<nom>", model: <résolu>, effort: <résolu>, prompt })`.
Jamais d'héritage implicite : un spawn sans `model`/`effort` fait tourner le teammate au modèle et à l'effort de la
session du teamleader, ce qui annule tout le réglage ci-dessous.

- **Sous-agents temporaires** (`sub-planner-N`, `sub-reviewer-<dimension>`, `sub-qa-<scope>`) : valeurs résolues de
  leur coordinateur (`planner`, `code-reviewer`, `qa`), sauf valeur explicite dans la demande de spawn.
- **Teamleader** : le Claude principal ne peut pas changer son propre modèle ; `/init-project` écrit les valeurs
  résolues (`teamleader.md` > `teamleader.template.md`) dans `.claude/settings.json` (`model`, `effortLevel`), et
  `/start-session` vérifie que la session tourne avec elles. Ne pas éditer `settings.json` à la main : modifier le
  compagnon puis relancer `/init-project` (mises à jour).

Valeurs par défaut du template :

| Agent | Modèle | Effort | Pourquoi |
|-------|--------|--------|----------|
| teamleader | `opus` | `medium` | Tient une machine à états à chaque tour : la capacité compte, pas la profondeur de réflexion |
| `planner` | `fable` | `high` | Une fois par milestone ; porte lots, contrats et ordre — une erreur coûte des cycles à toute l'équipe |
| `infra` | `opus` | `medium` | Validation à chaque déploiement ; la profondeur ne sert qu'à l'audit initial du pipeline |
| `security` | `sonnet` | `high` | Ponctuel (`/secu`), rare donc marginal |
| `code-reviewer` | `sonnet` | `medium` | À chaque lot, jusqu'à 3 cycles, plus les sous-reviewers : l'effort le plus sollicité du pipeline, d'où `medium` (un `high` y serait le plus coûteux) |
| `dev-*`, `test-writer`, `qa`, `pr-reviewer`, `deploy`, `generic` | `sonnet` | `medium` | Exécution bornée par un plan et des contrats |
| `marketing` | `sonnet` | `low` | Rédaction depuis des données GitHub |
| `doc-updater` | `haiku` | `low` | Mise à jour de documents |

### 7.1 Adéquation au projet — signaux de réévaluation

Ces valeurs sont calibrées pour un projet applicatif « moyen ». `/init-project` (Génération de la Configuration,
section 2ter) confronte les réponses de l'init à la grille ci-dessous et **alerte** quand un agent semble
sous- ou sur-dimensionné ; il ne surcharge jamais rien sans validation.

| Signal (source) | Agents concernés | Suggestion |
|-----------------|------------------|------------|
| Données sensibles, paiements ou authentification (Étape 10) | `security` / `code-reviewer` | `opus` / `high` ; `code-reviewer` effort `high` |
| Firmware, temps réel, concurrence fine (Étapes 5, 5d) | `dev-firmware*` (ou `dev-*` concerné) | effort `high` |
| Stack sans template dédié — `dev-generic` (Étape 5d) | instance `dev-generic` | effort `high` (moins de garde-fous dans le template) |
| Plusieurs composants ou instances multiples (≥ 3 agents de stack) | `implementation-planner`, `code-reviewer` | conserver `fable`/`high` ; `code-reviewer` effort `high` |
| Déploiement complexe (`kubernetes-helm`, ≥ 3 environnements, `rebuild-ci`) (Étape 8) | `infra`, `deploy` | `infra` conserver `opus` ; `deploy` effort `high` |
| Aucun déploiement distant, ou `promote` local seul (Étape 8) | `infra` | `sonnet` / `medium` |
| Petit projet : prototype, script, composant unique, sans environnement (Étapes 1, 8) | `implementation-planner`, `qa`, `test-writer` | planner `opus`/`medium` ; `qa`/`test-writer` effort `low` |
| Budget ou quota contraint (cadrage, contraintes q13-q17) | tous sauf teamleader | descendre d'un cran l'effort, `opus`→`sonnet` hors planner |
| Rédaction longue ou analyse (instance `generic.<nom>`, Étape 5c) | l'instance | `opus` / `medium` |

Un agent dont le compagnon porte déjà une surcharge `model:`/`effort:` est une décision du projet : il n'est **pas**
signalé, seulement listé en revue détaillée.
