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
[DOC-CHECK] --> Détecter les changements documentaires → proposer /context-audit
    |
    v
[ETAT] --> Verifier l'etat du projet
    |
    v
[DOC] --> Mettre a jour la documentation
    |
    v
[MEMOIRE] --> Mettre a jour .claude/memory/MEMORY.md
    |
    v
[GIT] --> S'assurer que tout est commite (jamais de push pendant le dev, voir COMMON.md 7.1)
    |
    v
[BRANCHES] --> Classer les branches residuelles ; supprimer les sures sur confirmation
    |
    v
[TEAM] --> Fermer tous les teammates (/team-delete --force)
    |
    v
[RAPPORT] --> Rapport de session
```

## Etapes Detaillees

### 0. DOC-CHECK — Changements documentaires

**Première action, avant tout le reste.**

Détecter si des fichiers de définition projet ont changé depuis le dernier commit sur main :

```bash
# Fichiers de définition modifiés (commités ou non)
git diff --name-only main...HEAD -- \
  'CLAUDE.md' '.claude/agents/' '.claude/commands/' 'TEMPLATE_claude/' \
  2>/dev/null

git status --short | grep -E '(CLAUDE\.md|\.claude/(agents|commands)|TEMPLATE_claude/)'
```

Si des changements sont détectés, afficher **avant de continuer** :

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

```bash
# Etat git
git status
git log --oneline -5

# Tests (si applicable)
{TEST_CMD}

# Build (si applicable)
{BUILD_CMD}
```

Verifier :
- Pas de changements non commites non intentionnels
- Tests passent
- Build OK

### 2. DOC — Documentation

Mettre a jour si necessaire :
- `CHANGELOG.md` : ajouter les changements de la session si pas encore fait
- `docs/` : mettre a jour les docs techniques impactees
- `README.md` : si des fonctionnalites majeures ont change

### 3. MEMOIRE — Mise a jour de `.claude/memory/MEMORY.md`

Mettre a jour les sections pertinentes :
- Version courante
- Travail en cours (phase actuelle)
- Decisions techniques prises pendant la session
- Issues GitHub ouvertes / fermees
- Points de contexte importants pour la prochaine session

### 4. GIT — Verification Git

```bash
# S'assurer que tout est commite (PAS de push — voir context/COMMON.md section 7.1 :
# le premier push des commits dev vers origin a lieu au prochain deploiement QUALIF,
# jamais avant ; tous les agents partagent le meme clone local)
git status

# Verifier qu'il n'y a pas de travail en attente
git stash list
```

Si des changements non commites existent :
- Demander via `AskUserQuestion` (jamais en texte) : `"Changements non commités — que faire ?"` — options : **Commiter** / **Stasher** / **Laisser en l'état**

### 4bis. BRANCHES — Branches residuelles

Le nettoyage normal a lieu en fin de `/deploy prod` (`agents/deploy.md` Étape 6), dont les règles s'appliquent
ici. Cette étape rattrape ce qui a échappé à ce nettoyage : PROD jamais déployée, mécanisme `promote`, merge fait
à la main, session interrompue, PR externe mergée. **Source unique du classement** : `/start-session` (étape 5bis)
réutilise ce script en lecture seule.

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
**Supprimer les N branches** (Recommandé, liste dans la question) / **Ne rien supprimer**. Puis, pour chaque
branche retenue, supprimer ce qui existe :

```bash
git push origin --delete "$b" 2>/dev/null   # si la branche existe en remote
git branch -D "$b" 2>/dev/null              # si la branche existe en local
```

**Branches `A_ARBITRER`** — dans le même appel, jusqu'à 3 questions (une par branche, les suivantes vont au
rapport) : `"<branche> : N commits absents de main (PR <état>) — que faire ?"` — options : **Conserver**
(Recommandé) / **Supprimer (N commits perdus)**. Avant la question, afficher `git log --oneline origin/main..<branche>`
pour que l'utilisateur voie ce qui serait perdu. Récupérer ce travail (merge/cherry-pick dans le milestone actif)
n'est pas du ressort de `/end-session` : le noter dans le rapport (« Pour la prochaine session »).

> Exécuté par le teamleader, propriétaire du HEAD (`agents/context/COMMON.md` « Branche Courante ») : `git branch -D`
> lui est permis. Une suppression de branche distante ne pousse aucun commit — compatible avec COMMON.md §7.1.

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

[ETAT] Git : 0 modifications non commitees ✅
[ETAT] Tests : 47/47 passes ✅
[DOC] CHANGELOG.md : a jour ✅
[MEMOIRE] MEMORY.md mis a jour ✅
[GIT] Commits locaux sur milestone/v1.4.0 — push differe au prochain deploiement QUALIF ✅
[BRANCHES] milestone/v1.3.0 (SURE) supprimee local + remote ✅ — fix/old-login conservee (3 commits hors main) ⚠
[TEAM] /team-delete --force — 2 teammate(s) fermés ✅

--- Rapport de Session ---
Branche : milestone/v1.4.0
Travail : Implementation OAuth2 (phases PLAN + DEV completees)
Prochaine etape : /review puis /qa
```

## Agent

Execution directe — pas de delegation a un agent specialise.
Coordonne les mises a jour de documentation et de memoire.
