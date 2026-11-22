# TEST_PLAN.md — Plan de tests (§15)

> Extrait de `commands/context/COMMON.md` (numérotation conservée, les renvois « COMMON.md §N » restent valables) :
> à lire **seulement** quand la tâche touche les tests (sélection des NR, journal, classement des échecs, durée, exécution par lot) — pas à chaque commande.

## 15. Plan de Tests

Objectif : **ne jamais exécuter deux fois le même test sur le même code sans raison**, et séparer
les tests de la feature en cours des tests de non-régression (NR).

### 15.1 Deux natures de tests : l'arborescence porte l'identité, l'index porte l'état

**Arborescence (identité stable)** — les tests de **spécification** écrits par le `test-writer` sont rangés en
`<racine-famille>/<theme>/<lot>/<fichier>` :

| Niveau | `<famille>` (racine) | `<theme>` | `<lot>` |
|--------|----------------------|-----------|---------|
| Intégration | `tests/integration/` | domaine fonctionnel (`auth`, `paiement`, `export`…) | sous-ensemble cohérent du thème (`login`, `refresh-token`…) |
| E2E | `e2e/` (ou `tests/e2e/` — la racine imposée par le framework) | idem | idem |
| Procédures manuelles | `tests/procedures/` | idem | idem |

- `<theme>` et `<lot>` : kebab-case, noms parlants — le chemin se lit comme une documentation.
- **Un lot = au plus `testing.lot_max_tests` cas de test (défaut 50)**. Au-delà, le `test-writer` scinde le lot
  (`login` → `login-nominal`, `login-erreurs`). Un scénario `smoke` ou `critical` isolé va dans son propre lot.
- **Tests unitaires** : restent colocalisés avec le code (`*_test.go`, `*.test.ts`…) — hors arborescence
  ci-dessus. Leur « lot » est le paquet ou le dossier source.

**Index (état qui change)** — `tests/INDEX.md` (initialisé par `/init-project` ; le `test-writer` y ajoute ses lots,
le CDP change les statuts) ne porte **que ce que le chemin ne peut pas dire** : statut, tags, composant, feature.
Une ligne par **lot** (chemin se terminant par `/`) ; une ligne **fichier** n'existe que pour une exception
(ex. un test en `quarantaine` au sein d'un lot) et prime sur la ligne du lot :

```markdown
| Chemin | Niveau | Composant | Feature | Statut | Tags |
|--------|--------|-----------|---------|--------|------|
| tests/integration/auth/login/ | integration | auth | #220 | regression | critical |
| e2e/paiement/checkout/ | e2e | billing | #231 | feature | smoke |
| tests/integration/auth/login/expired_token_test.go | integration | auth | #220 | quarantaine | |
```

**Repli sans index** (projet initialisé avant cette convention, ou lot absent) : un lot sans ligne est traité au
statut `feature` (il est donc rejoué à chaque cycle — sens sûr) et le CDP crée sa ligne à la première promotion.
Les anciennes lignes « une par fichier » restent valides (le chemin peut être un fichier).

| Statut | Signification |
|--------|---------------|
| `feature` | Tests de la feature en cours (milestone en développement) |
| `regression` | Tests de features déjà livrées — **promus** par le CDP au déploiement PROD du milestone. Un test de reproduction de bugfix naît directement `regression` |
| `quarantaine` | Test en échec connu ou instable (raison + issue obligatoires). Il ne bloque pas le verdict mais reste listé dans chaque rapport QA |

Tags : `smoke` (rapide, valide qu'une version démarre), `critical` (scénarios vitaux, utilisés en hotfix),
`slow` (exclu de la boucle DEV rapide, toujours joué par QA).

**Propriété de l'écriture** : le `test-writer` écrit les tests de spécification (contrats, critères
d'acceptation, maquettes), les range par lot et alimente l'index (une ligne par lot). Les `dev-*` n'écrivent que des tests unitaires
**internes** (boîte blanche), dans des fichiers distincts, colocalisés avec le code, hors index.

### 15.2 Qui lance quoi, quand

| Étape | Agent | Ce qui est exécuté |
|-------|-------|--------------------|
| Boucle DEV | `dev-*` | build, lint, typecheck, puis uniquement les tests **liés à leurs fichiers modifiés**, hors tag `slow` (`commands.test_related`, sinon `commands.test_targeted` sur les paquets/dossiers touchés — 15.10) — **jamais** la suite complète |
| Écriture des tests | `test-writer` | Uniquement **ses propres fichiers** de test : compilation + RED attendu (15.10) — jamais les suites de l'équipe |
| RED CHECK (bugfix) | `qa` | Le seul test de reproduction, sur le code **non corrigé** : il doit échouer (15.5) |
| QA — par cycle | `qa` | 1) suite **feature** complète (unit, integration, E2E, tags `slow` inclus) ; **si elle est KO → retour DEV immédiat, sans NR** ; 2) si OK, NR **impactées** (15.3) selon `testing.regression_at_qa` ; 3) conformité aux maquettes (§14) |
| NR complète | `qa` | Toute la suite (`commands.test` + E2E automatisés), au moment fixé par `testing.full_regression_at` (15.4) |
| BUILD | `deployer` | **Compilation seulement** (`commands.build`). Aucun test : ils ont déjà été joués par QA sur le même arbre |
| DEPLOY | `deployer` | Tests `smoke` de l'index (à défaut, `curl /health`) |
| GATE 4 | utilisateur | Procédures manuelles `tests/procedures/` (feature uniquement) |

Une passe de tests complète n'est **jamais** lancée par un `dev-*`, le `test-writer` ni le `deployer`.

### 15.2b Plan de test HTML du GATE

Au GATE LOT / GATE 4, la validation humaine s'appuie sur un **plan de test HTML** généré par le CDP depuis les procédures
`tests/procedures/` : un bloc par lot, une section par issue, prérequis succincts, tableau `Action / Résultat attendu`,
OK / KO + commentaire par scénario `HUMAIN`, bouton « Copier le rapport ». Modèle : `templates/test-plan/plan-de-test.exemple.html`
(à copier et remplir, pas à réécrire). Fichier généré dans `_work/test-plan/` (non commité) ; rapport reçu dans
`_work/reports/test-report-<lot>.md`. Titre d'onglet court `LOT-N · vX.Y.Z` (favicon 🧪 + bandeau vert, `MOCKUPS.md` 14.3), un seul onglet réutilisé par session puis fermé en fin de GATE. Le rapport n'est lu qu'**après** la réponse de l'utilisateur (`agents/cdp.md`,
« GATE de validation par tests »). Contrainte connue : le serveur du launcher sert la page en `sandbox` sans
`allow-same-origin` — `localStorage` indisponible, la saisie n'est pas conservée à un rechargement.

### 15.3 Sélection des NR impactées

Le diff du milestone est mappé sur les composants (`testing.components`, clé = composant, valeur = globs de
chemins source). Sont sélectionnés : (a) les lots (et tests) `regression` de l'index dont le composant est touché,
(b) les tests colocalisés des paquets/dossiers modifiés (résolus par `commands.test_targeted`, avec
`{TARGETS}` remplacé par la liste de fichiers ou dossiers). Un changement de contrat BREAKING ou CHANGED
sélectionne tous les tests des composants liés. Sans mapping ni `commands.test_targeted` : repli sur toute
la NR unitaire.

`testing.regression_at_qa` :
- `gated` (**défaut**) : NR impactées seulement si la suite feature est OK ;
- `parallel` : suite feature et NR impactées en même temps (plus rapide, plus d'exécutions perdues) ;
- `none` : aucune NR en QA — la NR complète (15.4) est alors la seule protection.

### 15.4 NR complète

`testing.full_regression_at` :
- `qualif` (**défaut**) : le CDP dispatche la NR complète à `qa` **en parallèle** de la chaîne
  BUILD → PUBLISH QUALIF → DEPLOY QUALIF et de DOC finalize. **GATE 4 ne s'ouvre que lorsque les trois sont
  terminés** et la NR VALIDATED : l'utilisateur n'est jamais invité à valider une QUALIF condamnée. NR KO → retour
  DEV sans solliciter l'utilisateur (compte comme un cycle) ;
- `build` : NR complète avant PUBLISH QUALIF, en parallèle de la compilation (PUBLISH attend les deux) ;
- `prod` : une seule NR avant PUBLISH PROD (`/deploy prod` refusé tant qu'elle n'est pas VALIDATED).

En **hotfix**, la NR complète tourne après le DEPLOY PROD, en arrière-plan sur `main` ; un échec ouvre une issue.

### 15.5 Bugfix : test rouge vérifié

Le `test-writer` livre le test de reproduction (statut `regression`) **avant** le DEV. Le CDP dispatche
alors `qa` en `Scope : red-check` : ce seul test est exécuté sur le code non corrigé et **doit échouer**. S'il
passe, il ne reproduit pas le bug : retour au `test-writer` (hors comptage de cycles). Après le fix, QA relance
ce test (doit passer) puis les NR du composant.

### 15.6 Journal d'exécution (réutilisation par arbre git)

`_work/tests-ledger.md` (append-only, non tracké) : `<tree-hash> | <scope> | <verdict> | <date>`, avec
`tree-hash = git rev-parse HEAD^{tree}` (working tree propre) ; le `<scope>` peut désigner un lot (`feature:integration/auth/login`). Avant d'exécuter un scope, `qa` cherche une ligne
VALIDATED pour le même arbre et le même scope : si elle existe, il **réutilise** le résultat (ex. redispatch après
un REVIEW REJECTED sans changement de code, ou NR complète déjà VALIDATED pour le mode `prod`).

### 15.7 Classement des échecs et métriques

Chaque test en échec du rapport QA reçoit une **nature** :

| Nature | Critère |
|--------|---------|
| `feature` | test au statut `feature` |
| `regression` | test au statut `regression` sur du code modifié par la feature |
| `quarantaine` | test déjà en quarantaine (n'impacte pas le verdict) |
| `environnement` | échec lié à la machine (port occupé, réseau, outil absent) — à confirmer par relance |
| `flaky` | passe à la relance — **une relance maximum**, puis passage en `quarantaine` dans l'index |

À chaque verdict QA, le CDP ajoute une ligne à `tests/METRICS.md` : date, milestone, feature, cycle, verdict,
nombre d'échecs par nature. Ce journal donne le **taux réel de retours dus à la régression** et permet de choisir
`regression_at_qa` et `full_regression_at` avec des chiffres.

### 15.8 Scopes optionnels

Le planner fixe `test_scopes` dans le plan : `perf` si un critère d'acceptation porte sur la performance
(seuils dans `testing.perf`), `security` si une préoccupation de `security.concerns` est touchée
(`commands.audit`). Sans mention, ces scopes ne sont pas joués. `lint` et `typecheck` sont joués par les
`dev-*` (boucle DEV) ; `audit` une fois par milestone, par QA, avant la NR complète.

### 15.9 Exécution par lot et progression

QA n'exécute jamais une famille de tests en un seul appel opaque quand elle compte plusieurs lots : il exécute
**lot par lot** (`commands.test_targeted`, `{TARGETS}` = le dossier du lot ; ordre : unitaires → intégration → E2E),
et **envoie un jalon au teamleader à la fin de chaque lot** :

```
QA EN COURS — lot 3/12 (integration/auth/login) — 148/612 tests, 2 KO
```

- Format : `lot i/N (<famille>/<theme>/<lot>)`, tests exécutés / total, nombre de KO cumulés. Les KO sont nommés
  dans le jalon dès qu'ils apparaissent (pas d'attente de la fin de suite).
- **Plancher** : sous ~100 tests au total, un seul lot (pas de découpage — le coût de démarrage dépasserait le gain).
- Le teamleader relaie chaque jalon à l'utilisateur en **une ligne** ; il peut ordonner l'arrêt du run si l'utilisateur
  le demande. Sans ordre d'arrêt, tous les lots sont joués : le rapport liste tous les échecs d'un coup.
- Le journal (15.6) est tenu **par lot** : un lot VALIDATED sur le même arbre git n'est pas rejoué.

### 15.10 Durée des tests : chaîne native, petits paquets, runner réglé, tests ciblés

Une passe de tests qui se compte en heures vient presque toujours de l'une de ces quatre causes (retour
d'expérience : vitest > 1 h avec le Node Windows sous WSL, `go test -race` ≈ 225 s sur un seul paquet `main`,
jsdom ≈ 62 % du temps vitest, suites complètes relancées par chaque `dev-*`, le `test-writer` et `qa`).

**1. Chaîne d'outils native de l'OS qui exécute.** Build et tests tournent avec les binaires de l'OS de l'agent :
sous WSL, `node`/`npm`/`npx`/`go`/`python` **Linux** — jamais les `.exe` Windows atteints via `/mnt/c` (interop
+ système de fichiers 9p : un ordre de grandeur plus lent, verrous Windows sur `node_modules`).

- `commands.env` (préfixe shell, ex. `export PATH=$HOME/.nvm/versions/node/v22.11.0/bin:/usr/local/go/bin:$PATH`)
  est évalué par tout agent avant la première commande `commands.*` de sa session.
- Contrôle avant le premier build/test de la session (`dev-*`, `test-writer`, `qa`, `deployer`) :

```bash
eval "$(jq -r '.commands.env // ""' .claude/project-config.json)"
if grep -qi microsoft /proc/version 2>/dev/null; then
  for t in node npm npx go python3; do
    p=$(command -v "$t") || continue; r=$(readlink -f "$p")
    case "$r" in /mnt/*|*.exe|*.cmd) echo "⚠ $t → $r (binaire Windows sous WSL)";; esac
  done
fi
```

- Binaire Windows détecté → `BLOQUE — toolchain Windows : <outil> → <chemin>` au teamleader, **sans lancer de
  suite** et sans basculer seul : `node_modules` est lié à l'OS qui l'a installé (binaires natifs esbuild,
  rollup…) ; la bascule = arrêter tout processus Windows qui le verrouille, `npm ci` côté Linux, mettre à jour
  `commands.env` — décision utilisateur, tâche du `deployer`/`infra`.
- La contrainte « worktrees jetables sous `/mnt/c` » n'existe que pour une chaîne Windows ; avec une chaîne
  native, les worktrees jetables vont sur le système de fichiers Linux (plus rapide).

**2. Petits paquets, parallélisables.** Les runners parallélisent par unité (paquet Go, fichier vitest/jest,
module pytest-xdist) : une unité monolithique sérialise toute la suite.

- Go : `cmd/<app>` reste mince (câblage) ; la logique et ses tests vivent dans `internal/<domaine>/`.
  `t.Parallel()` pour les tests indépendants. Aucune attente fixe (`time.Sleep`, harnais différé) : attendre un
  événement ou un canal, avec échéance.
- Budget indicatif : **~60 s par unité** (paquet, fichier) dans les conditions de QA (`-race` compris). QA publie
  les 5 unités les plus lentes dans son rapport (section « Durées ») ; une unité hors budget → le teamleader
  propose une issue de découpage (planner). On ne découpe pas en passant au milieu d'une feature.

**3. Runner JS (vitest/jest) réglé pour la vitesse.**

- `environment: 'node'` par défaut ; `jsdom`/`happy-dom` seulement pour les fichiers qui touchent le DOM
  (`// @vitest-environment jsdom` en tête de fichier, ou `test.projects` séparant `*.dom.test.*`) — créer jsdom
  pour chaque fichier coûte cher.
- `pool: 'threads'` ; `vmThreads` (jsdom réutilisé par worker, isolation réduite) seulement après une suite
  complète verte et sans flaky. `--reporter=dot` en QA et en CI.
- Ces réglages modifient la configuration de test du projet : tâche planifiée (issue, lot, QA complète), jamais
  une retouche en passant.

**4. Tests ciblés : chacun ne lance que ce qui le concerne.**

| Agent | Lance | Ne lance jamais |
|-------|-------|-----------------|
| `dev-*` | Tests liés à ses fichiers modifiés : `commands.test_related` (`{FILES}` = fichiers source modifiés — ex. `npx vitest related --run {FILES}`), sinon `commands.test_targeted` sur les paquets/dossiers touchés (`go test ./internal/foo -run <Motif>`, `pytest tests/foo -k <motif>`). Go : sans `-race`, sauf si le code touché est concurrent | La suite complète, même « pour vérifier » |
| `test-writer` | Ses propres fichiers de test : compilation, puis RED attendu (ou vert si le code existe déjà) | Les suites de l'équipe |
| `qa` | Les suites complètes, par lot (15.9), avec `-race`/`-count=1`, build, audits ; tient le journal (15.6) | — |
| `deployer` | `smoke` (15.2) | Toute autre suite |

- Une suite complète tourne **une fois par arbre git** (journal 15.6) et jamais deux en même temps sur le même
  dépôt (CPU partagé, fichiers de travail communs).
- Un `dev-*` qui soupçonne un effet de bord large (refactoring transverse, contrat partagé) l'écrit dans son DONE
  (`Impact large : <zones>`) : c'est QA qui élargit, pas le dev.
