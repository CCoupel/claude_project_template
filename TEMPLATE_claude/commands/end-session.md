# Commande /end-session

Cloturer proprement la session de travail : archivage, mise a jour de la memoire,
verification de l'etat du projet.

## Usage

```
/end-session
```

## Quand l'utiliser

- En fin de session de travail
- Avant une longue interruption
- Apres une release majeure
- Quand on change de contexte de travail

## Workflow

```
/end-session
    |
    v
[ETAT GIT] --> deployer : SESSION STATE (branche, arbre, stash, fichiers de definition modifies)
    |
    v
[DOC-CHECK] --> Changements documentaires → proposer /context-audit
    |
    v
[ETAT] --> Arbre sale : question → deployer commite ; puis qa : Scope session (tests + build)
    |
    v
[DOC + MEMOIRE] --> doc-updater : DOC SESSION (CHANGELOG/docs/README + .claude/memory/MEMORY.md, commit)
    |
    v
[GIT] --> deployer : SESSION STATE final (arbre propre ; jamais de push pendant le dev, COMMON.md 7.1)
    |
    v
[BRANCHES] --> deployer : classer les branches residuelles ; supprimer les sures sur confirmation
    |
    v
[TEAM] --> Fermer tous les teammates (/team-delete --force)
    |
    v
[RAPPORT] --> Rapport de session
```

## Delegation

Le teamleader **coordonne et questionne** ; il n'execute ni `Bash` git/build/test, ni `Edit`/`Write` hors
`_work/tasks/` (CLAUDE.md « Délégation Stricte »). Toute la commande passe par des ordres aux teammates, encore
actifs a ce stade (fermes a l'etape 5) :

| Besoin | Ordre | Agent |
|---|---|---|
| Etat git, fichiers de definition modifies | `SESSION STATE` | `deployer` |
| Commiter le travail en attente | `SESSION COMMIT : <message>` | `deployer` |
| Tests + build de verification | `Scope : session` | `qa` |
| CHANGELOG, docs, README, `MEMORY.md` | `DOC SESSION` | `doc-updater` |
| Branches residuelles | `BRANCHES CLASSIFY` / `BRANCHES DELETE` | `deployer` |
| `git stash` (operation HEAD du checkout principal) | — | teamleader (exception HEAD, `agents/context/COMMON.md` « Branche Courante ») |

**Aucune team active** (session sans `/start-session`) : les etapes deleguees ne peuvent pas s'executer — le
signaler dans le rapport (« etat non verifie — relancer `/start-session` puis `/end-session` ») et passer aux
etapes 6-7.

## Etapes Detaillees

### Préalable — ETAT GIT

**Première action.** Ordre a `deployer` : `SESSION STATE`. Le `DONE` contient (definition dans `agents/deploy.md`
« Tache SESSION ») : branche courante, `git status --short`, `git log --oneline -5`, `git stash list`, et les
fichiers de definition modifies depuis `main` (commites ou non) — `CLAUDE.md`, `.claude/agents/`, `.claude/commands/`,
`TEMPLATE_claude/`. Les etapes 0, 1 et 4 s'appuient sur ce retour.

### 0. DOC-CHECK — Changements documentaires

A partir de la liste des fichiers de definition modifies du `SESSION STATE`. Si elle n'est pas vide, afficher
**avant de continuer** :

```
⚠️  Changements documentaires détectés :
   - .claude/commands/context-audit.md  (nouveau)
   - .claude/agents/qa.md               (modifié)
   - CLAUDE.md                          (modifié)

   Recommandé : lancer /context-audit pour vérifier cohérence et
   optimisation avant de clôturer.
```

Puis poser la question via `AskUserQuestion` (jamais en texte) :
`"Changements documentaires détectés — lancer /context-audit maintenant ?"` — options : **Lancer /context-audit** (Recommandé) / **Continuer sans audit**.

- Si **lancer** → suspendre end-session, exécuter `/context-audit`, puis reprendre à l'étape 1
- Si **continuer** → continuer end-session normalement

Si aucun changement documentaire → passer directement à l'étape 1 sans message.

### 1. ETAT — Verification du Projet

1. **Arbre sale** (`git status --short` non vide dans le `SESSION STATE`) : presenter les fichiers, puis
   `AskUserQuestion` : `"Changements non commités — que faire ?"` — options : **Commiter** (Recommandé) → ordre
   `SESSION COMMIT : <message conventionnel>` a `deployer` / **Stasher** → `git stash push -u -m "end-session <date>"`
   par le teamleader (operation HEAD) / **Laisser en l'état**.
2. **Tests + build** — ordre a `qa` : `Scope : session` (tests + build, reutilisation du
   `_work/tests-ledger.md` si l'arbre est deja VALIDATED). Arbre laisse sale → `qa` repond `BLOQUE` (tests
   uniquement sur du code commite) : noter « tests non joues — arbre non commite » dans le rapport.

Verifier dans les retours :
- Pas de changements non commites non intentionnels
- Tests passent
- Build OK

### 2-3. DOC + MEMOIRE — Documentation et memoire projet

Ordre a `doc-updater` (fichier `_work/tasks/doc-updater-<timestamp>.md`, ordre de plus de 3 lignes) : `DOC SESSION`,
avec le contenu que seul le teamleader connait :

- **Documentation**, si necessaire : `CHANGELOG.md` (changements de la session pas encore notes), `docs/` (docs
  techniques impactees), `README.md` (si des fonctionnalites majeures ont change).
- **`.claude/memory/MEMORY.md`** — sections a mettre a jour, valeurs fournies dans l'ordre :
  - Version courante
  - Travail en cours (phase actuelle)
  - Decisions techniques prises pendant la session
  - Issues GitHub ouvertes / fermees
  - Points de contexte importants pour la prochaine session

`doc-updater` ecrit et commite (`docs(session): ...`), sans push. Le teamleader relit `MEMORY.md` (lecture
autorisee) pour controler le `DONE` par rapport a l'ordre.

### 4. GIT — Verification Git

Ordre a `deployer` : `SESSION STATE` (final). L'arbre doit etre propre apres les commits des etapes 1 et 2-3 ;
**pas de push** — voir `context/COMMON.md` section 7.1 : le premier push des commits dev vers origin a lieu au
passage des issues en `DONE`, jamais avant ; tous les agents partagent le meme clone local.

Arbre encore sale (fichiers apparus depuis l'etape 1) → meme question qu'a l'etape 1.

### 4bis. BRANCHES — Branches residuelles

Le nettoyage normal a lieu en fin de `/deploy prod` (`agents/deploy.md` Étape 6), dont les règles s'appliquent
ici. Cette étape rattrape ce qui a échappé à ce nettoyage : PROD jamais déployée, mécanisme `promote`, merge fait
à la main, session interrompue, PR externe mergée. **Source unique du classement** : `/start-session` (étape 5bis)
réutilise ce script en lecture seule.

**Délégation** : le teamleader n'exécute aucun `Bash` git (CLAUDE.md « Délégation Stricte »). Il ne fait que
poser les questions ; le classement, l'affichage des commits et les suppressions sont des ordres à `deployer`.
L'étape a lieu **avant** la fermeture de la team (étape 5). Aucune team active → étape non exécutée, le signaler
dans le rapport (« branches résiduelles non vérifiées — prochain `/start-session` »).

1. **Classement** — ordre à `deployer` : `"BRANCHES CLASSIFY : exécute le script de end-session.md étape 4bis
   (lecture seule) ; pour chaque A_ARBITRER joins git log --oneline origin/main..<branche>"`. Le `DONE` contient
   la sortie du script et les logs.
2. **Questions** — le teamleader pose les `AskUserQuestion` ci-dessous à partir de ce `DONE`.
3. **Suppression** — ordre à `deployer` : `"BRANCHES DELETE : sure <b1> <b2> ; arbitree <b3>"` (`sure` = classée
   `SURE` ; `arbitree` = `A_ARBITRER` dont l'utilisateur a choisi la suppression). Le `DONE` liste ce qui a été
   supprimé ; une branche devenue `PROTEGEE`, ou une branche `sure` qui a reçu un commit depuis le classement,
   n'est pas supprimée et est signalée.

Script de classement (exécuté par `deployer`) :

```bash
git fetch --prune --quiet
CUR=$(git branch --show-current)
# Branches protegees : milestones GitHub ouverts (titre "X.Y.Z..." ou "vX.Y.Z...") + branches checkoutees dans un worktree
ACTIVE=$(gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.state=="open") | .title' \
         | grep -oE '^v?[0-9]+\.[0-9]+\.[0-9]+' | sed -E 's|^v?|milestone/v|')
WT=$(git worktree list --porcelain | sed -n 's|^branch refs/heads/||p')
NAMES=$( { git for-each-ref --format='%(refname:lstrip=2)' refs/heads
           git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin; } \
         | sort -u | grep -vxE 'HEAD|main|gh-pages.*' )
for b in $NAMES; do
  if [ "$b" = "$CUR" ] || printf '%s\n' "$ACTIVE" "$WT" | grep -qxF "$b"; then
    echo "PROTEGEE   $b"; continue
  fi
  n=0; tips=""
  for r in "refs/heads/$b" "refs/remotes/origin/$b"; do
    git show-ref -q --verify "$r" || continue
    n=$((n + $(git rev-list --count "origin/main..$r"))); tips="$tips $(git rev-parse "$r")"
  done
  # PR MERGED : sure seulement si chaque tip (local/remote) est un head de PR mergee
  # (squash merge = commits "non merges" au sens git ; un commit pousse apres le merge = a arbitrer)
  merged=$(gh pr list --head "$b" --state merged --json headRefOid -q '.[].headRefOid')
  pr=$(gh pr list --head "$b" --state all --json state -q '.[0].state')
  all_merged=1; for t in $tips; do printf '%s\n' "$merged" | grep -qxF "$t" || all_merged=0; done
  if [ "$n" -eq 0 ] || { [ -n "$merged" ] && [ "$all_merged" -eq 1 ]; }; then
    echo "SURE       $b"
  else
    echo "A_ARBITRER $b  commits_hors_main=$n  PR=${pr:-aucune}"
  fi
done
```

| Classe | Signification | Action |
|---|---|---|
| `PROTEGEE` | Branche courante, milestone GitHub encore ouvert, ou checkoutee dans un worktree | Ne jamais toucher |
| `SURE` | Aucun commit absent de `origin/main`, ou chaque tip est le head d'une PR `MERGED` | Proposer la suppression |
| `A_ARBITRER` | Commits absents de `main` : PR `CLOSED` non mergée, pas de PR, commits poussés après le merge, milestone livré dont une partie n'a pas rejoint `main` | Ne pas supprimer sans accord explicite |

`main`, `gh-pages*` et `HEAD` sont exclus d'office. Aucune branche → passer l'étape sans message.

**Branches `SURE`** — une question `AskUserQuestion` : `"Branches résiduelles sans travail perdu — supprimer
(local + remote) ?"`. 1 à 4 branches : `multiSelect: true`, une option par branche. Plus de 4 : options
**Supprimer les N branches** (Recommandé, liste dans la question) / **Ne rien supprimer**. Les branches retenues
partent dans l'ordre `BRANCHES DELETE`, où `deployer` supprime ce qui existe :

```bash
# exécuté par deployer, pour chaque branche de l'ordre (après re-vérification : ni courante, ni worktree,
# ni milestone ouvert, tip inchangé depuis BRANCHES CLASSIFY)
git push origin --delete "$b" 2>/dev/null   # si la branche existe en remote
git branch -D "$b" 2>/dev/null              # si la branche existe en local
```

**Branches `A_ARBITRER`** — dans le même appel, jusqu'à 3 questions (une par branche, les suivantes vont au
rapport) : `"<branche> : N commits absents de main (PR <état>) — que faire ?"` — options : **Conserver**
(Recommandé) / **Supprimer (N commits perdus)**. Avant la question, afficher le `git log --oneline
origin/main..<branche>` remonté par `deployer` pour que l'utilisateur voie ce qui serait perdu. Une branche
« Supprimer » rejoint l'ordre `BRANCHES DELETE`. Récupérer ce travail (merge/cherry-pick dans le milestone actif)
n'est pas du ressort de `/end-session` : le noter dans le rapport (« Pour la prochaine session »).

> `git branch -D` d'une branche non courante est permis à `deployer` pour ce nettoyage (`agents/context/COMMON.md`
> « Branche Courante », exception nettoyage) : il ne touche pas au HEAD. Une suppression de branche distante ne
> pousse aucun commit — compatible avec COMMON.md §7.1.

### 5. TEAM — Fermeture des teammates

Fin de session = fermeture inconditionnelle, y compris les teammates en cours de tâche.
Exécuter `/team-delete --force` (voir `team-delete.md`).

Si aucune team n'est active, passer cette etape.

### 6. PURGE — Nettoyage du dossier de travail temporaire

Workflow encore en cours (`.claude/workflow-state.json` avec `status` différent de `completed`/`abandoned`, ex. un
milestone à lots dont il reste des lots) → **purge sélective** : la prochaine session le reprendra
(`start-session.md` étape 2).

```bash
STATE=.claude/workflow-state.json
# status absent (etat anterieur a ce champ) : termine si toutes les phases sont completed/skipped
DONE_Q='(.status // (if ([.phases[]?.status] | length > 0 and all(. == "completed" or . == "skipped"))
          then "completed" else "in_progress" end)) | IN("completed","abandoned")'
if [ -f "$STATE" ] && ! jq -e "$DONE_Q" "$STATE" >/dev/null; then
  rm -rf _work/tmp/ _work/tasks/      # rapports, handoffs, tests-ledger, maquettes conservés
else
  rm -rf _work/
fi
```

> `_work/` contient les rapports et handoffs inter-agents de la session (gitignored).
> Ils ne sont plus utiles une fois le workflow terminé — tant qu'il ne l'est pas, ils servent à la reprise.

### 7. RAPPORT — Rapport de Session

```markdown
## Rapport de Session — <date>

**Duree** : [estimation]
**Branche** : <branche>
**Version** : <version courante>

### Ce qui a ete fait
- <tache 1> ✅
- <tache 2> ✅
- <tache 3> 🔄 (en cours)

### Decisions techniques
- <decision 1> — <raison>
- <decision 2> — <raison>

### Pour la prochaine session
- <point d'attention 1>
- <prochaine etape>

### Etat du projet
- Tests : [PASS|FAIL|N/A]
- Build : [OK|KO|N/A]
- Deploy : [PROD vX.Y.Z|staging|non deploye]
- Branches residuelles : [aucune | N supprimees | <branche> conservee (N commits hors main)]
```

## Exemple

```
/end-session

[ETAT GIT] deployer SESSION STATE : 0 modifications non commitees ✅
[ETAT] qa Scope session : tests 47/47 passes, build OK ✅
[DOC + MEMOIRE] doc-updater DOC SESSION : CHANGELOG.md a jour, MEMORY.md mis a jour, commit a1b2c3d ✅
[GIT] Commits locaux sur milestone/v1.4.0 — push differe au prochain deploiement QUALIF ✅
[BRANCHES] milestone/v1.3.0 (SURE) supprimee local + remote ✅ — fix/old-login conservee (3 commits hors main) ⚠
[TEAM] /team-delete --force — 2 teammate(s) fermés ✅

--- Rapport de Session ---
Branche : milestone/v1.4.0
Travail : Implementation OAuth2 (phases PLAN + DEV completees)
Prochaine etape : /review puis /qa
```

## Agent

Le teamleader coordonne et pose les questions ; l'execution est deleguee (voir « Delegation ») : `deployer` (git,
branches), `qa` (tests, build), `doc-updater` (documentation, memoire).
