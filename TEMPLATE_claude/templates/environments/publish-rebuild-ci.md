# Publish — {ENV_NAME} (mecanisme : rebuild-ci)

> Genere depuis `TEMPLATE_claude/templates/environments/publish-rebuild-ci.md` — selectionne car
> `infrastructure.environments[].publish.mode = "rebuild-ci"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache PUBLISH {ENV_NAME}, etape
> [2. MECANISME]. Pipeline CI : `{CI_PIPELINE}`.

Merge vers `main` + tag officiel, qui declenche la CI. La CI reconstruit depuis exactement la
meme source figee (le tag), en suivant l'unique pipeline — reproductible, mais recalcule, jamais
un build ad hoc (voir principe BORE, `agents/infra.md` section 3, mecanisme "rebuild
deterministe").

## Variables attendues

Aucune dans `.env`/`<env>.env` — les commandes `git`/`gh` ci-dessous utilisent l'authentification
ambiante du poste (`gh auth login` deja fait). Les secrets consommes PAR LA CI elle-meme
(`{CI_PIPELINE}`) sont geres separement, dans les secrets du systeme CI/CD (ex. GitHub Actions
repo secrets), jamais dans ces fichiers `.env` locaux.

```bash
# 1. Verification
# Prerequis confirmes par le teamleader avant cet ordre. Une publication validee sur l'environnement
# precedent de la chaine doit exister — sauf hotfix ou ordre portant `Cadrage : sans QUALIF`
# (agents/context/MILESTONE_CADRAGE.md section 5), ou ce candidat vient directement de BUILD.

# 1bis. Determination de la version cible
# X.Y.Z est fixe integralement par le milestone (regle complete : commands/context/COMMON.md
# section 5.7). {VERSION_FILE} porte deja ce X.Y.Z depuis l'ouverture du cycle — aucun calcul,
# on retire uniquement le compteur de build "a" pour obtenir la version officielle.
DEV_VERSION=$(cat {VERSION_FILE})       # ex: 1.4.0.3 — c'est l'artefact deja publie et valide
VERSION=$(echo "$DEV_VERSION" | cut -d. -f1-3)   # X.Y.Z, ex: 1.4.0
# Ecrire $VERSION dans {VERSION_FILE} avant le merge

# 1ter. Verification documentation (avant merge)
# En orchestration teamleader : DOC FINALIZE fait par doc-updater, ou CHANGELOG tenu par les agents DEV
# (cadrage `doc: dev`) — verifier juste la reception du DONE. Standalone : verifier manuellement, sinon STOP.
# Recherche sur X.Y.Z (section de release du CHANGELOG), jamais sur X.Y.Z.a : `a` est incremente au BUILD,
# apres l'ecriture du CHANGELOG.
grep -q "$VERSION" CHANGELOG.md || {
  echo "CHANGELOG.md sans section $VERSION — STOP, retour doc-updater (ou agent DEV si cadrage doc: dev)."
  exit 1
}
# README/docs concernes : verifier manuellement qu'ils refletent les changements de ce release.

# 1quater. BARRIERE — pre-validation verte sur le SHA exact (un tag ne sert JAMAIS de test)
# Le workflow de pre-validation (`.github/workflows/ci-branch.yml`, infra.md §3bis C10, qui ne lance
# que `commands.ci`) doit etre vert sur le commit exact de la branche milestone qui va etre merge.
# Sinon : STOP — pas de merge dans main, pas de tag.
git push origin milestone/vX.Y.Z
SHA=$(git rev-parse milestone/vX.Y.Z)
gh run list --workflow ci-branch.yml --commit "$SHA" --json status,conclusion,databaseId \
  --jq '.[0]'    # attendu : status=completed, conclusion=success
# Aucun run sur ce SHA -> le declencher : gh workflow run ci-branch.yml --ref milestone/vX.Y.Z
#   puis `gh run watch <id> --exit-status`. Run rouge/absent -> PUBLISH FAILED (categorie CODE/FLAKY,
#   voir Echec) ; ne rien merger, ne rien taguer.

# 2. Promotion (sans supprimer la branche de travail) — la branche de travail est la branche
# milestone (milestone/vX.Y.Z), qui a accueilli tout le cycle FEATURE/BUGFIX/REFACTOR ;
# ce merge est le SEUL moment ou ce travail rejoint main.
#
# Securite : pousser d'abord l'etat local exact de la branche milestone — un commit local peut
# exister depuis la derniere publication (ex: fix mineur post-validation, suivi d'un nouveau
# /build) sans avoir encore ete pousse (voir context/COMMON.md section 7.1). Garantit que le
# rollback en cas d'echec (ci-dessous) dispose de l'etat exact merge, avant la suppression de la
# branche distante en cas de succes (voir `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, Etape 6).
git push origin milestone/vX.Y.Z

# Mode de fusion vers main : defaut PROJET `release.merge_mode` (project-config.json, defaut `pr`), surcharge
# MILESTONE `cadrage.merge_mode` (workflow-state.json, MILESTONE_CADRAGE.md §2). Jamais de contournement des
# regles de la branche : ni `--admin`, ni push force, ni desactivation de protection.
MODE=$(jq -r '.cadrage.merge_mode // empty' .claude/workflow-state.json 2>/dev/null)
[ -n "$MODE" ] || MODE=$(jq -r '.release.merge_mode // "pr"' .claude/project-config.json)

if [ "$MODE" = pr ]; then
  # Preflight : `release.verified.status` doit valoir `ok` (sondes de /init-project Etape 8c : droit de creer et
  # fusionner la PR sans contournement). Sinon STOP -> PUBLISH FAILED (CONFIG), avec la marche a suivre de 8c.
  [ "$(jq -r '.release.verified.status // "absent"' .claude/project-config.json)" = ok ] || { echo "release.verified != ok"; exit 1; }
  # 2a. PR milestone -> main (reutiliser la PR ouverte si elle existe : reprise apres echec)
  PR=$(gh pr list --head milestone/vX.Y.Z --base main --state open --json number -q '.[0].number')
  [ -n "$PR" ] || PR=$(gh pr create --base main --head milestone/vX.Y.Z --title "Release v$VERSION" \
        --body "Release v$VERSION — milestone vX.Y.Z (pre-validation CI verte sur $SHA)" | grep -oE '[0-9]+$')
  # 2b. Attendre les checks requis, puis fusionner CE SHA exact en merge commit (historique milestone preserve :
  #     condition du nettoyage des branches, deploy.md Etape 6 ; pas de --delete-branch, le nettoyage est a l'Etape 6)
  gh pr checks "$PR" --watch --required || exit 1
  gh pr merge "$PR" --merge --match-head-commit "$SHA" --subject "Release v$VERSION" || exit 1
  git fetch origin main
  MERGE_SHA=$(gh pr view "$PR" --json mergeCommit -q .mergeCommit.oid)
  # Refus de fusion (approbation requise, regle non satisfaite, file de fusion...) : PUBLISH FAILED categorie CONFIG,
  # escalade au teamleader — surtout pas de `--admin` ni de `--auto` pour esquiver une regle.
else
  # `direct` : merge dans un worktree detache sur origin/main — le HEAD du checkout principal reste sur la branche
  # milestone (il appartient au teamleader, voir context/COMMON.md « Branche Courante et Historique »)
  REL=.claude/worktrees/release
  git fetch origin main
  git worktree add --detach "$REL" origin/main
  git -C "$REL" merge --no-ff milestone/vX.Y.Z -m "Release v$VERSION"
  git -C "$REL" push origin HEAD:main || { git worktree remove --force "$REL"; exit 1; }   # protege -> passer en `pr`
  MERGE_SHA=$(git -C "$REL" rev-parse HEAD)
  git worktree remove "$REL"
fi

# 3. Tag officiel — LE declencheur du rebuild deterministe. Le pipeline CI (`{CI_PIPELINE}`) est
# configure sur `tags: ['v*']` : ce push de tag lance le job de build, qui reconstruit depuis ce
# commit fige et publie le resultat (registre / GitHub Release).
git tag -a "v$VERSION" "$MERGE_SHA" -m "Release v$VERSION"   # tag sur le commit de merge
git push origin "v$VERSION"

sleep 5
RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
CI_STATUS=$?
```

**CI_STATUS = 0 → continuer vers Notification.**

**CI_STATUS ≠ 0 → executer le protocole d'echec ci-dessous.**

## Echec

Le deployer ne corrige rien lui-même. Il identifie l'agent responsable et remonte au teamleader.

**Classifier :**

```bash
gh run view "$RUN_ID" --log-failed
```

| Catégorie | Indicateurs dans les logs | Build fiable ? | Agent responsable |
|-----------|--------------------------|------------------------|-------------------|
| **CODE** | Compilation échoue, tests régressent, lint | Non | `dev` |
| **FLAKY** | Timeout réseau, service tiers, race condition | Oui (retry) | `qa` |
| **CONFIG** | Secret manquant, variable absente, mauvais path | Oui | `infra` |
| **INFRA** | Registry inaccessible, runner hors ligne, quota | Oui | `infra` |

**Rapport au teamleader :**

```
SendMessage({
  to: "team-lead",
  content: "PUBLISH FAILED
Environnement : {ENV_NAME}
Version  : v[X.Y.Z]
Catégorie: [CODE|FLAKY|CONFIG|INFRA]
Run CI   : #[RUN_ID] — gh run view [RUN_ID] --log-failed"
})
```

**Politique de reprise** : apres un echec, le deployer **corrige sur la branche milestone** (via l'agent
responsable) et rejoue la pre-validation ; il ne **retague jamais** pour « retester » (le tag ne sert pas de
test). Un echec **FLAKY** se relance **une fois au plus** ; au deuxieme echec, analyse (traiter comme CODE).
L'ordre PROD de l'utilisateur n'autorise pas a retaguer sans limite (`CDP_WORKFLOWS.md` §7).

Le teamleader analyse le rapport et décide du routing et de la suite. En cas d'echec, le merge/tag sont
annules (voir Rollback ci-dessous) — aucun artefact partiellement publié ne doit rester
référençable.

```bash
# 4. Notification
echo "Publication {ENV_NAME} terminee - v$VERSION (tag pousse, CI OK)"
```

## Rollback

```bash
# Worktree detache sur origin/main (jamais de checkout dans le checkout principal)
git fetch origin main && git worktree add --detach .claude/worktrees/rollback origin/main
git -C .claude/worktrees/rollback revert -m 1 "$MERGE_SHA" --no-edit      # commit de merge de la release
if [ "$MODE" = pr ]; then
  # Meme regle que la publication : PR de revert, fusionnee sans contournement
  git -C .claude/worktrees/rollback push origin HEAD:refs/heads/revert/v[X.Y.Z]
  RPR=$(gh pr create --base main --head revert/v[X.Y.Z] --title "Revert release v[X.Y.Z]" --body "Rollback PUBLISH PROD" | grep -oE '[0-9]+$')
  gh pr checks "$RPR" --watch --required; gh pr merge "$RPR" --merge --delete-branch
else
  git -C .claude/worktrees/rollback push origin HEAD:main
fi
git worktree remove .claude/worktrees/rollback
git tag -d v[X.Y.Z]
git push origin --delete v[X.Y.Z]
# Correction : agent responsable (voir Echec ci-dessus), puis /publish {ENV_NAME_LOWER} a nouveau
```
