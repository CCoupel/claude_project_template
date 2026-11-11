# GITHUB.md — Patterns GitHub Partages

Centralise tous les patterns `gh` CLI utilises dans les commandes et agents.
**Toujours reference ce fichier plutot que de dupliquer ces patterns.**

---

## 1. Prerequis et Verification

### 1.1 Verifier l'authentification

A executer en debut de toute commande interagissant avec GitHub :

```bash
gh auth status
```

Si la commande echoue :
```
GitHub CLI non authentifie.
Lancez : gh auth login
Puis relancez la commande.
```

### 1.2 Recuperer owner/repo (pattern standard)

```bash
# Retourne "owner/repo" ex: "monorg/monprojet"
gh repo view --json owner,name --jq '.owner.login + "/" + .name'

# Retourne le chemin API complet ex: "repos/monorg/monprojet"
gh repo view --json owner,name --jq '"repos/" + .owner.login + "/" + .name'
```

Stocker dans une variable pour reutilisation :
```bash
REPO=$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')
# Utilisation : gh api repos/$REPO/milestones
```

---

## 2. Issues

### 2.1 Lister les issues

```bash
# Toutes les issues ouvertes
gh issue list --state open --limit 50

# Avec details JSON (pour affichage tableau)
gh issue list --state open --limit 100 \
  --json number,title,labels,assignees,milestone,updatedAt

# Filtres disponibles
gh issue list --state open --label "bug"
gh issue list --state open --assignee "@me"
gh issue list --state open --milestone "v1.2.0"
gh issue list --state closed --limit 20

# Issues sans milestone
gh issue list --state open --json number,title,labels,milestone \
  --jq '.[] | select(.milestone == null)'
```

### 2.2 Voir une issue

```bash
gh issue view <numero> --json number,title,body,labels,assignees,milestone,state
```

### 2.3 Creer une issue

```bash
gh issue create \
  --title "<titre>" \
  --body "<description>" \
  --label "<label1>,<label2>" \
  --assignee "<login>" \
  --milestone "<TITLE>"
```

> `--milestone` exige le titre exact du milestone (pas seulement sa version — le titre peut
> porter un nom apres " — ", voir section 3.1). Resoudre `<TITLE>` au prealable si on ne
> dispose que de la version (voir section 3.1 "Milestone correspondant a une version").

### 2.4 Modifier une issue

```bash
# Assigner un milestone
gh issue edit <numero> --milestone "<TITLE>"

# Changer les labels
gh issue edit <numero> --add-label "bug" --remove-label "feature"

# Changer l'assignee
gh issue edit <numero> --add-assignee "<login>"
```

### 2.5 Fermer / Rouvrir

```bash
# Fermer avec commentaire
gh issue close <numero> --comment "<message>"

# Fermer sans commentaire
gh issue close <numero>

# Rouvrir
gh issue reopen <numero>
```

### 2.6 Commenter une issue

```bash
gh issue comment <numero> --body "<message>"
```

---

## 3. Milestones

### 3.0 Etat d'un milestone — `due_on` = date de demarrage du dev

Le champ GitHub `due_on` (« Due date ») ne sert **pas** d'echeance : il porte la **date de demarrage du
developpement**, posee une seule fois par `deployer` (ordre `MILESTONE START`, `agents/deploy.md` Tache LABELS) a
l'ouverture de la branche `milestone/vX.Y.Z` (`context/CDP_WORKFLOWS.md` Phase Init). Lecture directe sur GitHub :

| Etat GitHub | Signification |
|---|---|
| `open`, sans due date | Planifie — dev pas encore demarre |
| `open`, avec due date | **En cours** depuis cette date |
| `closed` | Termine (livre en PROD — `agents/deploy.md` Etape 5) ; la due date reste la date de demarrage |

Ne jamais poser `due_on` a la creation (`/milestone new`), ni l'ecraser une fois posee.

### 3.0bis Historique du milestone (description GitHub)

La description du milestone porte, sous le texte libre (`Release vX.Y.Z`, conserve), un **bloc « Cadrage »**
(intensite, options, team — `agents/context/MILESTONE_CADRAGE.md`) puis un **bloc d'historique** : etat courant, tableau
des lots, journal date. Seul `deployer` l'ecrit (`agents/deploy.md` « Tache MILESTONE », script
`milestone_history`, idempotent) ; il est lisible directement sur la page du milestone :

```
**Cadrage**
- Intensite : complet (minor)
- Tests : test-writer
- Review : oui
- QUALIF : oui
- Doc : doc-updater
- Team : dev-backend, dev-frontend, test-writer, code-reviewer, qa, doc-updater

**Etat** : ⏸ LOT-2 a valider (depuis 2026-11-06)

| Lot | Etat | Depuis |
|---|---|---|
| LOT-1 | ✅ termine | 2026-11-04 |
| LOT-2 | ⏸ a valider | 2026-11-06 |

**Historique**
- 2026-11-01 — milestone : ▶ en cours
- 2026-11-02 — cadrage : 📋 complet · tests:test-writer review:oui qualif:oui doc:agent — valide au GATE 2
- 2026-11-02 — LOT-1 : ⏳ planifie
- 2026-11-03 — LOT-1 : 🧪 en QUALIF — v1.4.0.3
- 2026-11-04 — LOT-1 : ✅ termine — CI verte
- 2026-11-06 — LOT-2 : 🧪 en QUALIF — v1.4.0.5
- 2026-11-06 — LOT-2 : ⏸ a valider
- 2026-11-06 — milestone : ⏸ LOT-2 a valider
```

Evenements (vocabulaire fixe, icone comprise) — le teamleader ajoute la ligne `Milestone : <cible> → <etat> [— <detail>]`
a l'ordre `deployer` qu'il envoie a ce moment ; « deployer » = ecrit par `deployer` lui-meme dans sa tache :

| Moment | Cible → etat — detail | Porte par |
|---|---|---|
| Ouverture de la branche milestone (Phase Init) | `milestone → ▶ en cours` (+ due date) | ordre `MILESTONE START` |
| Plan rendu, question GATE 2 posee | `milestone → ⏸ plan a valider` (GATE 2 « Ajuster » / « Non » : `milestone → ▶ en cours — plan a revoir`) | ordre labels `→ PLAN A VALIDER` (§9.0b) |
| GATE 2 valide — cadrage | bloc « Cadrage » + `cadrage → 📋 <intensite> · tests:… review:… qualif:… doc:… — valide au GATE 2` (revision : la raison) | ordre `MILESTONE CADRAGE` |
| GATE 2 valide, plan avec lots | chaque `LOT-N → ⏳ planifie` | ordre `Labels GATE 2` (deployer, d'apres la table des lots) |
| Lancement du DEV d'un lot | `LOT-N → ▶ en cours` | ordre labels `→ EN COURS` du lot |
| DEPLOY QUALIF reussi | `LOT-N → 🧪 en QUALIF — <X.Y.Z.a>` (sans lots : `milestone → 🧪 en QUALIF`) | deployer (l'ordre QUALIF porte `Lot : LOT-N`) |
| BUILD seul, cadrage sans QUALIF | `LOT-N → 🧪 en validation locale — <X.Y.Z.a>` (sans lots : `milestone → …`) | deployer (ordre `Cadrage : sans QUALIF`) |
| Question GATE LOT posee (lot a validation humaine) | `LOT-N → ⏸ a valider` et `milestone → ⏸ LOT-N a valider` (valide : `milestone → ▶ en cours — LOT-N valide`) | ordre labels `→ LOT A VALIDER` (§9.4b) |
| GATE LOT refuse | `LOT-N → ↩ refuse — retour DEV` / `— retour PLAN` | ordre labels Cas A / Cas B |
| Lot : CI verte, issues fermees | `LOT-N → ✅ termine — CI verte` | ordre de fermeture des issues du lot |
| Publication anticipee (GATE LOT) | `LOT-N → ⇢ reporte — vers <milestone>` (lots restants) | ordre de deplacement des issues |
| GATE 4 refuse | `milestone → ▶ en cours — GATE 4 refuse, retour DEV` (ou `retour PLAN`) | ordre labels Cas A / Cas B |
| Question GATE 4 posee | `milestone → ⏸ a publier` | ordre labels `→ A PUBLIER` (§9.4b), ou ligne `Milestone` seule si aucune issue ouverte |
| PUBLISH PROD lance (GATE 4 valide) | `milestone → 🚀 mise en prod — vX.Y.Z` | deployer |
| Echec PROD / rollback | `milestone → ❌ mise en prod en echec — <cause>` | deployer |
| Cloture (Etape 5 de `deploy.md`, `/milestone close`) | `milestone → ✅ termine — tag vX.Y.Z` puis `state=closed` | deployer |

La description n'est jamais reecrite en entier : seul le bloc entre marqueurs est regenere.

### 3.1 Lister les milestones

```bash
# Tous les milestones ouverts (avec progression)
gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | select(.state=="open") | {number, title, open_issues, closed_issues, due_on}'

# Milestone actif : celui en cours (due date posee, voir 3.0), sinon le plus ancien planifie
gh api repos/{owner}/{repo}/milestones \
  --jq '[.[] | select(.state=="open")] | (map(select(.due_on != null)) | sort_by(.due_on) | .[0]) // (sort_by(.number) | .[0])'

# Milestone correspondant a une version — matching par PREFIXE, jamais par titre exact ni sur
# un separateur precis (le titre reel peut porter un nom descriptif apres le prefixe, avec un
# separateur non garanti — convention " — " via /milestone new, mais milestones plus
# anciens/manuels parfois en " - " ou autre ; voir 3.2 et context/COMMON.md section 5.7). Seul
# compte le caractere suivant le prefixe : ni chiffre ni point.
gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | select(.title == "<version>" or ((.title | ltrimstr("<version>")) as $rest
        | $rest != .title and ($rest == "" or ($rest[0:1] | test("[0-9.]") | not))))'
```

### 3.2 Creer un milestone

Le titre est toujours `<version>` (`vX.Y.Z`) seul, ou `<version> — <nom>` si un nom descriptif
est fourni — voir `commands/milestone.md` Mode NEW pour le detail complet (X/Y obligatoires,
Z auto-complete, unicite par prefixe de version).

```bash
# Sans nom
gh api repos/{owner}/{repo}/milestones \
  --method POST \
  -f title="<version>" \
  -f description="Release <version>"

# Avec nom descriptif — jamais de due_on ici : il est reserve a la date de demarrage (3.0)
gh api repos/{owner}/{repo}/milestones \
  --method POST \
  -f title="<version> — <nom>" \
  -f description="Release <version>"
```

### 3.3 Cloturer un milestone

```bash
# Recuperer d'abord le numero du milestone — matching par prefixe (voir 3.1)
MILESTONE_NUM=$(gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | select(.title == "<version>" or ((.title | ltrimstr("<version>")) as $rest
        | $rest != .title and ($rest == "" or ($rest[0:1] | test("[0-9.]") | not)))) | .number')

# Cloturer
gh api repos/{owner}/{repo}/milestones/$MILESTONE_NUM \
  --method PATCH \
  -f state="closed"
```

### 3.4 Progression d'un milestone

```bash
# Calcul : closed / (open + closed) * 100 — matching par prefixe (voir 3.1)
gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | select(.title == "<version>" or ((.title | ltrimstr("<version>")) as $rest
        | $rest != .title and ($rest == "" or ($rest[0:1] | test("[0-9.]") | not)))) |
    {
      title,
      total: (.open_issues + .closed_issues),
      done: .closed_issues,
      pct: (if (.open_issues + .closed_issues) > 0
            then (.closed_issues * 100 / (.open_issues + .closed_issues) | floor)
            else 0 end)
    }'
```

---

## 4. Pull Requests

### 4.1 Lister les PRs

```bash
gh pr list --state open
gh pr list --state merged --limit 10
gh pr list --base main --state open
```

### 4.2 Voir une PR

```bash
gh pr view <numero> --json number,title,body,author,headRefName,baseRefName,files,commits,state
```

### 4.3 Creer une PR

```bash
gh pr create \
  --title "<titre>" \
  --body "<description>" \
  --base main \
  --head <branche> \
  --label "<label>"
```

### 4.4 Merger une PR

```bash
# Squash merge (recommande pour main)
gh pr merge <numero> --squash --delete-branch

# Merge classique
gh pr merge <numero> --merge
```

### 4.5 Commenter / Reviewer une PR

```bash
# Commenter
gh pr comment <numero> --body "<message>"

# Approuver
gh pr review <numero> --approve --body "<commentaire>"

# Demander des modifications
gh pr review <numero> --request-changes --body "<corrections requises>"
```

---

## 5. Releases et Tags

### 5.1 Lister les releases

```bash
gh release list --limit 10
gh release list --json tagName,name,publishedAt,isPrerelease
```

### 5.2 Creer une release

```bash
# Depuis un tag existant
gh release create <tag> \
  --title "<titre>" \
  --notes-file RELEASE_NOTES.md

# Avec notes inline
gh release create <tag> \
  --title "v1.2.0 - <titre>" \
  --notes "<description>"

# Pre-release
gh release create <tag> --prerelease --title "<titre>" --notes "<description>"
```

### 5.3 Obtenir la derniere release

```bash
gh api repos/{owner}/{repo}/releases/latest --jq '{tag_name, name, published_at}'
```

### 5.4 Tags Git

```bash
# Dernier tag semantique
git tag --sort=-version:refname | head -1

# Lister les tags
git tag --list --sort=-version:refname

# Creer un tag annote
git tag -a <version> -m "Release <version>"
git push origin <version>

# Supprimer un tag (si besoin de rollback)
git tag -d <version>
git push origin --delete <version>
```

---

## 6. CI/CD (GitHub Actions)

### 6.1 Surveiller les workflows

```bash
# Lister les runs recents
gh run list --limit 10

# Suivre un run en temps reel
gh run watch

# Voir les details d'un run
gh run view <run-id>

# Verifier le statut du dernier run sur main
gh run list --branch main --limit 1 --json status,conclusion,headBranch \
  --jq '.[0] | {status, conclusion}'
```

### 6.2 Relancer un workflow

```bash
gh run rerun <run-id>
gh run rerun <run-id> --failed-only
```

### 6.3 Declencher un workflow manuellement

```bash
gh workflow run <nom-workflow>.yml \
  --ref main \
  --field version="v1.2.0"
```

---

## 7. Gestion d'Erreurs

### 7.1 Patterns d'erreurs courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `gh: command not found` | CLI non installe | `brew install gh` / voir cli.github.com |
| `Not Found (HTTP 404)` | Repo inaccessible ou inexistant | Verifier les droits et le nom du repo |
| `Bad credentials (HTTP 401)` | Token expire | `gh auth login` |
| `API rate limit exceeded` | Trop de requetes | Attendre ou utiliser un token avec plus de quota |
| `Resource not accessible` | Droits insuffisants | Verifier les scopes du token : `gh auth status` |

### 7.2 Verifier les scopes du token

```bash
gh auth status
# Doit inclure : repo, read:org (selon les besoins)
```

### 7.3 Template de verification pre-commande

```bash
# Verifier auth
if ! gh auth status &>/dev/null; then
  echo "Erreur : non authentifie sur GitHub. Lancez : gh auth login"
  exit 1
fi

# Verifier que c'est un repo GitHub
if ! gh repo view &>/dev/null; then
  echo "Erreur : ce repertoire n'est pas lie a un repo GitHub."
  exit 1
fi
```

---

## 8. Conventions du Projet

### 8.1 Nommage

| Element | Convention | Exemple |
|---------|------------|---------|
| Milestone | `vX.Y.Z` complet (sans `a`), optionnellement suivi de `" — <nom>"` — seule source de verite de la version du cycle (voir section 5.7 et section 3.1 ci-dessus pour le matching par prefixe) | `v1.4.0` ou `v1.4.0 — Authentification OAuth2` |
| Tag | Prefixe `v` + `X.Y.Z` | `v1.4.1` |
| Branche milestone | `milestone/vX.Y.Z` — accueille tout le travail FEATURE/BUGFIX/HOTFIX/REFACTOR du cycle (un seul milestone en developpement a la fois) | `milestone/v1.4.0` |

### 8.2 Labels standards

**Labels de type (detection du workflow) :**

| Label | Usage |
|-------|-------|
| `feature`, `enhancement` | Nouvelle fonctionnalite → `/feature` |
| `bug`, `fix`, `defect` | Bug → `/bugfix` |
| `hotfix`, `urgent`, `critical` | Correctif urgent → `/hotfix` |
| `refactor`, `tech-debt` | Refactoring → `/refactor` |
| `security`, `vulnerability` | Securite → `/secu` |
| `breaking` | Rupture de compatibilite de donnees → impacte `X` (voir section 8.3) |
| `roadmap` | Visible sur le site marketing |

**Labels de phase (cycle de vie dans le workflow) — source de verite unique :**

| Statut | Signification | Pose par | Pose quand | Retire quand |
|--------|---------------|----------|------------|--------------|
| `PLANNING` | Plan a elaborer (planner au travail) | CDP (`gh`, §9) | Phase 1 — debut du plan ; GATE 2 « Ajuster » / « Non » (plan a revoir) ; ou rejet GATE 4 / GATE LOT Cas B (scope invalide) | Planner `DONE`, plan presente au GATE 2 (→ `PLAN A VALIDER`) |
| `PLAN A VALIDER` | Plan (et cadrage) rendu, **en attente de la validation de l'utilisateur** (GATE 2) | CDP (`gh`, §9.0b) | Planner `DONE`, juste avant la question du GATE 2 | GATE 2 valide (→ `PRET`) ; « Ajuster » / « Non » (→ `PLANNING`) |
| `PRET` | Plan valide, developpement pas encore lance (lot en attente, ordre DEV non envoye) | CDP (`gh`, §9) | GATE 2 valide (depuis `PLAN A VALIDER`) | Ordre DEV du lot (→ `EN COURS`) |
| `EN COURS` | Developpement a faire ou en cours (ordre DEV envoye, jusqu'au retour DONE de tous les dev de l'issue) | CDP (`gh`, §9) | Ordre DEV du lot ; ou cycle correctif (REVIEW refuse / QA echoue) ; ou rejet GATE 4 Cas A | Retour DONE des dev (→ `EN REVIEW`) |
| `EN REVIEW` | Revue de code a faire ou en cours | CDP (`gh`, §9) | Retour DONE de tous les dev de l'issue | Verdict REVIEW (OK → `EN QA` seul ; refus → `EN COURS`) |
| `EN QA` | Validation QA a faire ou en cours | CDP (`gh`, §9) | Retour DONE des TEST-WRITER si parallele au REVIEW (defaut), sinon verdict REVIEW positif | QA valide (→ `DONE`) ou echec (→ `EN COURS`) |
| `DONE` | Implementation validee (QA OK) ; branche poussee, CI en cours puis verte (l'issue est alors fermee) ; avec lots, le lot est d'abord valide par l'utilisateur en QUALIF (GATE LOT, via `LOT A VALIDER`), puis pousse | CDP (`gh`, §9) | QA valide (le push de la branche et la CI suivent immediatement ; avec lots : Phase 5 QUALIF) ; ou reponse « valide » de l'utilisateur (`LOT A VALIDER` au GATE LOT, `A PUBLIER` au GATE 4) | Question GATE LOT (→ `LOT A VALIDER`) ou GATE 4 sur issue encore ouverte (→ `A PUBLIER`), §9.4b ; rejet GATE 4 (→ `EN COURS` ou `PLANNING`, issue rouverte si fermee) ; ou CI non verte (→ `EN COURS`) |
| `LOT A VALIDER` | Lot termine par l'equipe (QA OK, deploye en QUALIF ou artefact local), **en attente du test et de la validation de l'utilisateur** (GATE LOT) | CDP (`gh`, §9.4b) | Juste avant la question du GATE LOT d'un lot a issue `VALID-HUMAINE` (lot auto-valide : jamais) | Lot valide (→ `DONE`, puis push/CI) ; refus (issues concernees → `EN COURS` ou `PLANNING` ; les autres → `DONE`) |
| `A PUBLIER` | Milestone pret pour la PROD, **en attente du « Oui » de l'utilisateur** (GATE 4) — seulement pour une issue encore ouverte (`issues.close_on` = `validation`) ; les issues fermees ne changent pas : l'etat du milestone (3.0bis) porte l'attente | CDP (`gh`, §9.4b) | Juste avant la question du GATE 4 | « Oui » (→ `DONE` puis fermeture) ; refus (issues concernees → `EN COURS` ou `PLANNING` ; les autres → `DONE`) |
| `BLOQUE` | Avancement impossible (dependance externe, decision ou information en attente) — **s'ajoute** a la phase courante, qui est conservee pour la reprise | CDP (`gh`, §9), sur decision de l'utilisateur ou constat d'un blocage | Blocage constate, avec un commentaire precisant la cause | Blocage leve (la phase courante reprend) ou abandon |
| `ABANDONNE` | Issue abandonnee, ne sera pas traitee (terminal) | CDP (`gh`, §9), **uniquement sur decision de l'utilisateur** | Abandon decide, avec un commentaire precisant la raison | Reouverture manuelle (l'issue repart a `PLANNING`) |
| — (issue fermee) | CI verte sur la branche poussee (avec lots : apres la validation QUALIF du lot, GATE LOT) ; `issues.close_on` = `validation` : validation utilisateur qui la couvre (GATE LOT explicite, sinon GATE 4), §9.5. L'issue conserve `DONE`. **Ne vaut pas validation du milestone** : celle-ci reste a l'utilisateur (GATE 4) | CDP (`gh`, §9) | CI verte apres le push de la branche en `DONE` (avec lots : apres validation du lot, §9.5b) | Rejet GATE 4 pour cette issue (reouverture, label `DONE` retire) |

**Regle de semantique : l'etat dit ou en est l'issue dans le cycle (ce qui reste a faire), pas ce qu'un teammate
fait a cet instant.** Il change donc **au retour** du teammate (DONE/FAILED/BLOQUE) ou a la **validation de
l'utilisateur** (GATE), jamais seulement a l'envoi de l'ordre suivant : une issue en attente de lancement n'est pas
`EN COURS`, elle est `PRET`.

**Label de lot (decoupage du milestone par le planner) :** `LOT-1`, `LOT-2`… — pose par le CDP (via `deployer`, ordre unique
du GATE 2 avec `PRET`, §9.0 et §9.11) sur chaque issue de chaque lot, apres validation du plan (GATE 2). Ce n'est **pas** un label de phase : il se superpose a la
phase, n'est jamais retire par une transition et reste jusqu'a la fin du milestone. Une issue appartient a un seul lot. **Label de validation humaine :** `VALID-HUMAINE` — pose par le CDP (via `deployer`, §9.13) sur chaque issue dont au moins un scenario de test est `HUMAIN`. Superpose a la phase, jamais retire par une transition ; son absence = issue auto-validable (la QA suffit). Un lot est « a validation humaine » si l'une de ses issues le porte.

Notation `LOT-N` ou, pour un sous-lot, `LOT-N.M` (le sous-lot est l'unite de livraison ; le panneau l'affiche sous son lot parent `LOT-N`, dans l'ordre de livraison). La description du label porte l'objectif du lot (§9.11).

Regles :
- Les labels de phase (`PLANNING` → `PRET` → `EN COURS` → `EN REVIEW` / `EN QA` → `DONE` ⇄ `LOT A VALIDER` / `A PUBLIER`, avec `PLAN A VALIDER` entre `PLANNING` et `PRET`) sont **mutuellement exclusifs** (un seul a la fois), **sauf** `EN REVIEW` + `EN QA`
  simultanes pendant la fenetre de parallelisation Review/QA par defaut (voir `QUALITY.md` section 12) —
  les deux coexistent tant que REVIEW n'a pas rendu son verdict.
- `BLOQUE` est un **modificateur** : il coexiste avec le label de phase en cours et n'est jamais retire par une
  transition de phase — seule la levée du blocage le retire.
- `ABANDONNE` est **terminal** : il remplace tous les labels de phase (et `BLOQUE`) et ferme l'issue (`not planned`).
- Chaque transition de phase pose le nouveau label **et retire les autres labels de phase** (commandes en section 9).
- **Fermeture = CI verte, pas validation utilisateur** (defaut `issues.close_on` = `ci` ; projet qui exige la
  validation utilisateur : `validation`, §9.5). A `DONE`, le CDP pousse la branche du milestone ; la CI
  de validation (`infra.md` §3bis, C10) s'execute. CI verte → l'issue est fermee. **Avec lots**, le push n'a lieu
  qu'apres la validation QUALIF du lot par l'utilisateur (GATE LOT, §9.5b) ; aucune validation n'est demandee apres
  la CI. CI **non verte** (rouge, orange, annulee ou en erreur) → l'issue repart a `EN COURS` avec un commentaire
  precisant l'echec, correction, nouveau cycle QA, nouveau push. Une issue n'est jamais fermee sur une CI non verte.
- **Le milestone reste lie a la validation utilisateur** (GATE 4) : fermer les issues ne cloture pas le milestone ni
  ne declenche PROD.
- **`PLAN A VALIDER`, `LOT A VALIDER`, `A PUBLIER` = la balle est dans le camp de l'utilisateur** : poses juste avant
  la question du GATE correspondant (GATE 2, GATE LOT a validation humaine, GATE 4), retires a sa reponse. Un lot
  auto-valide (aucune issue `VALID-HUMAINE`) et une issue deja fermee n'y passent jamais. Le milestone porte la meme
  attente dans son etat (3.0bis : `⏸ plan a valider`, `⏸ LOT-N a valider`, `⏸ a publier`) — c'est la seule trace
  quand plus aucune issue n'est ouverte (GATE 4 avec `close_on` = `ci`). Le GATE 4d (maquette marketing) n'a pas d'etat.
- Rejet a GATE 4 : seules les issues **concernees** par le refus sont rouvertes (les autres restent fermees) ; leur
  label `DONE` (ou `A PUBLIER`) est retire et elles repartent vers :
  - `EN COURS` — correction dans le scope (bug, regression, precision) → retour Phase DEV (Cas A)
  - `PLANNING` — scope invalide (approche erronee, exigences changees) → retour Phase 1 (Cas B)

Voir `agents/context/CDP_PHASES_RELEASE.md` (GATE 4) pour le detail de la decision Cas A / Cas B.
Ce tableau et la section 9 sont la **seule definition** des statuts : les autres fichiers y renvoient, sans la recopier.

### 8.3 Mapping Labels → Segment de Version

Utilise par `/milestone new` (Etape 6) et a chaque association d'issue en cours de cycle (`gh issue edit --milestone`) pour verifier que le saut de version choisi correspond a la nature des issues associees — voir `context/COMMON.md` section 5.7. Verification **non-bloquante** : simple avertissement en cas d'ecart.

| Label | Segment attendu | Force |
|-------|------------------|-------|
| `breaking` | `X` doit augmenter | forte |
| `feature`, `enhancement` | `Y` doit augmenter (si pas de `breaking` dans le lot) | moyenne |
| `bug`, `fix`, `defect`, `hotfix`, `urgent`, `critical`, `refactor`, `tech-debt`, `security`, `vulnerability` | `Z` seul peut augmenter | faible |

Le plus fort gagne : un lot mixte `breaking` + `bug` → `X` doit avoir bouge, peu importe `Y`/`Z`. La verification porte toujours sur l'ensemble des issues **actuellement** associees au milestone, jamais en delta par issue ajoutee (idempotent).

Si le label `breaking` n'existe pas encore sur le repo :

```bash
gh label create "breaking" --color "d73a4a" --description "Rupture de compatibilite de donnees (bump majeur, segment X)"
```

### 8.4 Format des commits avec issue

```bash
feat(scope): Description (#42)
fix(scope): Description (#38)
```

---

## 9. Gestion des Labels de Phase

**Propriétaire** : le teamleader (CDP). Il n'a ni `Bash` ni outil GitHub MCP : il **ordonne** à `deployer`
(une ligne, inline) d'exécuter les commandes ci-dessous, puis attend son `DONE`.
**Règle** : à chaque changement de phase, les labels de **toutes** les issues de `ISSUE_NUMS[]` sont mis à jour
**avant** d'envoyer l'ordre de la phase suivante. Une phase sans labels à jour n'est pas terminée.

```
SendMessage({ to: "deployer", content: "Labels : issues #12 #15 → EN COURS (GITHUB.md §9.1)" })
```

`gh` est la procédure de référence (un outil GitHub MCP, s'il est présent dans la session de `deployer`, est
équivalent — jamais requis). Toute transition retire les autres labels de phase. La fermeture d'une issue suit
§9.5 ; la clôture du milestone reste soumise à la validation utilisateur (GATE 4).

### 9.0a Transition vers `PLANNING` (entrée en Phase Plan)

```bash
gh issue edit <numero> --add-label "PLANNING" --remove-label "PRET,EN COURS,EN REVIEW,EN QA,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,DONE"
```

### 9.0 Transition vers `PRET` + pose des lots (GATE 2 validé) — un seul ordre

A la validation du plan par l'utilisateur, le CDP envoie a `deployer` **un seul ordre** qui pose `PRET` sur **toutes**
les issues du milestone **et** le label de lot de chacune (§9.11), construit a partir de la table « Lots » du plan
valide (`_work/reports/plan-[timestamp].md`). Les issues passent ensuite a `EN COURS` lot par lot, a l'ordre DEV (§9.1).

**Forme de l'ordre** (une ligne, tous les lots du plan, chaque issue de `ISSUE_NUMS[]` presente une fois ; l'objectif
de chaque lot entre « », recopie de la colonne Objectif ; un lot decoupe figure seul, sans issue, pour son objectif) :

```
SendMessage({ to: "deployer", content: "Labels GATE 2 (GITHUB.md §9.0) : PRET sur #12 #15 #18 #19 ; LOT-1 « Authentification » → #12 #15 ; LOT-2 « Export des donnees » ; LOT-2.1 « Export CSV » → #18 ; LOT-2.2 « Export PDF » → #19" })
```

Milestone a issue unique (pas de table « Lots ») : `Labels GATE 2 (GITHUB.md §9.0) : PRET sur #12 ; sans lot`.

**Verifications de `deployer` avant d'executer** (refus = `LABELS FAILED` + motif, aucun label pose) :
- chaque issue de la liste `PRET` apparait dans **exactement un** lot (ou l'ordre dit `sans lot`) ;
- chaque nom de lot respecte `^LOT-[0-9]+(\.[0-9]+)?$` ; un lot sans issue n'est admis que s'il a des sous-lots dans
  l'ordre (`LOT-2` pour `LOT-2.1`) ; chaque objectif fait 100 caracteres au plus (limite GitHub d'une description) ;
- les issues listees appartiennent au milestone courant (`gh issue view <numero> --json milestone`).

```bash
gh label create "LOT-1" --color "5319e7" --description "Authentification" --force   # chaque lot de l'ordre, parents compris : cree, ou met a jour l'objectif
gh issue edit <numero> --add-label "PRET,LOT-1" --remove-label "PLANNING,PLAN A VALIDER"      # pour chaque issue, avec son lot
```

Rapport attendu : `LABELS DONE` avec le recapitulatif `#numero → PRET, LOT-n` par issue (le CDP le compare a la
table du plan avant le premier ordre DEV ; tout ecart = nouvel ordre correctif, pas de DEV).

### 9.0b Transition vers `PLAN A VALIDER` (plan rendu, GATE 2 posé) et retour

Au retour du planner (`DONE`, plan rendu), **juste avant** la question du GATE 2 : toutes les issues du milestone
(ou de `ISSUE_NUMS[]`) passent `PLAN A VALIDER`, avec l'etat du milestone (ligne `Milestone : milestone → ⏸ plan a
valider` dans l'ordre). GATE 2 valide : ordre unique `PRET` + lots (§9.0, qui retire `PLAN A VALIDER`) et
`Milestone : milestone → ▶ en cours — plan valide`. « Ajuster » / « Non » : retour a `PLANNING` (§9.0a) et
`Milestone : milestone → ▶ en cours — plan a revoir`.

```bash
gh issue edit <numero> --add-label "PLAN A VALIDER" --remove-label "PLANNING"
# ordre du teamleader : "Labels : issues #12 #15 → PLAN A VALIDER (GITHUB.md §9.0b) ; Milestone : milestone → ⏸ plan a valider"
```

### 9.1 Transition vers `EN COURS` (ordre DEV du lot envoyé, ou cycle correctif)

```bash
gh issue edit <numero> --add-label "EN COURS" --remove-label "PLANNING,PRET,EN REVIEW,EN QA,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,DONE"
```

### 9.2 Transition vers `EN REVIEW` (REVIEW en cours)

```bash
gh issue edit <numero> --add-label "EN REVIEW" --remove-label "PLANNING,PRET,EN COURS,EN QA,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,DONE"
```

### 9.3 Transition vers `EN QA` (QA en cours)

```bash
gh issue edit <numero> --add-label "EN QA" --remove-label "PLANNING,PRET,EN COURS,EN REVIEW,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,DONE"
```

### 9.4 Transition vers `DONE` (QA validée) — puis push et CI

```bash
gh issue edit <numero> --add-label "DONE" --remove-label "PLANNING,PRET,EN COURS,EN REVIEW,EN QA,PLAN A VALIDER,LOT A VALIDER,A PUBLIER"
git push origin milestone/vX.Y.Z   # la CI de validation (C10) demarre
```

### 9.4b Transitions vers `LOT A VALIDER` (GATE LOT) / `A PUBLIER` (GATE 4) et retour

Posées **juste avant** la question, sur les issues que la réponse de l'utilisateur couvre, avec l'état du milestone :
- **GATE LOT** d'un lot à validation humaine (au moins une issue `VALID-HUMAINE`) : toutes les issues du lot →
  `LOT A VALIDER`, après DEPLOY QUALIF (ou BUILD local, cadrage sans QUALIF) ; `Milestone : LOT-N → ⏸ a valider` et
  `Milestone : milestone → ⏸ LOT-N a valider`. Lot auto-validé : aucune transition, il reste `DONE`.
- **GATE 4** : `Milestone : milestone → ⏸ a publier` (toujours) ; `issues.close_on` = `validation` : les issues `DONE`
  **encore ouvertes** du milestone → `A PUBLIER`. Les issues fermées ne sont jamais modifiées.

```bash
gh issue edit <numero> --add-label "LOT A VALIDER" --remove-label "DONE"   # GATE LOT
gh issue edit <numero> --add-label "A PUBLIER" --remove-label "DONE"       # GATE 4, issue encore ouverte
# ordres du teamleader :
#   "Labels : issues #12 #15 → LOT A VALIDER (GITHUB.md §9.4b) ; Milestone : LOT-2 → ⏸ a valider ; Milestone : milestone → ⏸ LOT-2 a valider"
#   "Labels : issues #12 #15 → A PUBLIER (GITHUB.md §9.4b) ; Milestone : milestone → ⏸ a publier"   (sans issue ouverte : la seule ligne Milestone)

# Validation (GATE LOT « Valider », GATE 4 « Oui ») → retour a DONE, puis push/CI (§9.5b) ou fermeture (§9.7)
# (GATE LOT valide : Milestone : milestone → ▶ en cours — LOT-N valide ; GATE 4 « Oui » : 🚀 mise en prod, ecrit par deployer)
gh issue edit <numero> --add-label "DONE" --remove-label "PLAN A VALIDER,LOT A VALIDER,A PUBLIER"

# Refus : issues concernees → §9.6 (Cas A EN COURS / Cas B PLANNING) ; les autres issues du lot → DONE (ligne ci-dessus)
```

### 9.5 Résultat de la CI

Mode de fermeture : `project-config.json` → `issues.close_on` — `ci` (défaut, absent = `ci`) : l'issue est fermée sur
CI verte ; `validation` : elle reste ouverte en `DONE` jusqu'à une **validation utilisateur** qui la couvre — GATE LOT
**explicite** (lot à issue `VALID-HUMAINE` validé par l'utilisateur ; un lot auto-validé ne compte pas) ou, à défaut,
« Oui » au GATE 4 — puis elle est fermée avant la Phase 6.

```bash
# CI verte, close_on = ci (defaut) → fermeture de l'issue (elle conserve DONE)
gh issue comment <numero> --body "✅ CI verte — QA OK — en attente de validation utilisateur (GATE 4)"
gh issue close <numero>

# CI verte, close_on = validation → issue laissee ouverte (DONE)
gh issue comment <numero> --body "✅ CI verte — QA OK — fermeture a la validation utilisateur"
# ... puis, a la validation (GATE LOT explicite ou GATE 4 « Oui ») : LOT A VALIDER / A PUBLIER → DONE (§9.4b), puis
gh issue close <numero> --comment "✅ Valide par l'utilisateur (<GATE LOT LOT-N | GATE 4>)"
# ordre du teamleader : "Fermeture validee (<GATE LOT LOT-N | GATE 4>) : issues #12 #15"

# CI non verte (rouge, orange, annulee, en erreur) → correction obligatoire, l'issue reste ouverte
gh issue comment <numero> --body "🔴 CI non verte — <job en echec, lien du run>"
gh issue edit <numero> --add-label "EN COURS" --remove-label "DONE,PLAN A VALIDER,LOT A VALIDER,A PUBLIER"
```

### 9.5b Lot : QUALIF, validation, push (GATE LOT)

> Cadrage sans QUALIF (`agents/context/MILESTONE_CADRAGE.md` section 5) : « deploye en QUALIF » se lit « BUILD seul,
> artefact local » — le GATE LOT porte sur cet artefact ; le reste du deroulement est inchange.

Les lots sont traites **un a la fois**. Quand la QA valide le lot (`DONE`), il est deploye en QUALIF (Phase 5) puis
presente a l'utilisateur (question et options : point « GATE LOT » du tableau de `agents/cdp.md`, avec le lien de la
QUALIF et du rapport QA ; **lot sans issue `VALID-HUMAINE` : auto-valide, GATE LOT sans question** ; sinon synthese des tests, chemin de la procedure et ouverture dans Chrome : regle « GATE de validation par tests » de `agents/cdp.md`). Il n'y a **aucune** validation apres la CI du lot.

```
QA valide → label DONE → Phase 5 (BUILD, PUBLISH QUALIF, DEPLOY QUALIF) → label LOT A VALIDER (§9.4b ; lot auto-valide :
  reste DONE, pas de question) → GATE LOT : l'utilisateur teste et valide
  OUI → label DONE (§9.4b) → push de la branche du milestone → CI de validation (C10)
          CI verte     → fermeture des issues du lot (§9.5, DONE conserve ; close_on = validation : seulement si le
                         GATE LOT a ete valide explicitement, sinon ouvertes jusqu'au GATE 4) → lot suivant (§9.0 → §9.1)
          CI non verte → §9.5 (EN COURS, correction, nouveau push)
  NON → seules les issues concernees repartent : meme procedure que §9.6 (Cas A → EN COURS, Cas B → PLANNING),
        sans reouverture puisque l'issue n'est pas encore fermee ; les autres issues du lot → DONE (§9.4b)
```

Historique du milestone (3.0bis) — lignes `Milestone : …` a ajouter aux ordres `deployer` de ce cycle : lancement du
lot (`LOT-N → ▶ en cours`), fermeture apres CI verte (`LOT-N → ✅ termine — CI verte`), refus (`LOT-N → ↩ refuse —
retour DEV|PLAN`), publication anticipee (`LOT-N → ⇢ reporte — vers <milestone>` pour chaque lot restant). Le passage
`🧪 en QUALIF` est ecrit par `deployer` lui-meme apres DEPLOY QUALIF.

**Publication anticipee** (option du GATE LOT) : les lots restants (issues `PRET`) sont deplaces vers un autre
milestone (`gh issue edit <numero> --milestone "<TITLE>"` ; le label `LOT-N` les suit) puis le milestone est publie
avec les seuls lots valides (GATE 4 / Phase 6).

### 9.6 Rejet à GATE 4 (validation utilisateur refusée)

Seules les issues **concernées** sont rouvertes (ou, encore ouvertes en `A PUBLIER`, simplement relabellisées) ; les
autres restent fermées (ouvertes en `A PUBLIER` : retour à `DONE`, §9.4b). Le label `DONE` / `A PUBLIER` est retiré et la
destination dépend de la nature de la correction (cf. `agents/context/CDP_PHASES_RELEASE.md`, GATE 4 — Cas A / Cas B) :

```bash
# Pour chaque issue concernee uniquement
gh issue reopen <numero>
gh issue comment <numero> --body "↩ Rouverte — GATE 4 refuse : <ecart constate>"

# Cas A — correction dans le scope (bug, régression, précision) → retour Phase DEV
gh issue edit <numero> --add-label "EN COURS" --remove-label "DONE,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,EN REVIEW,EN QA"

# Cas B — scope invalide (approche erronée, exigences changées) → retour Phase 1
gh issue edit <numero> --add-label "PLANNING" --remove-label "PRET,DONE,PLAN A VALIDER,LOT A VALIDER,A PUBLIER"
```

### 9.7 Validation GATE 4 (OUI)

Aucun changement sur les issues (déjà fermées en `DONE`) — sauf `issues.close_on` = `validation` : les issues encore
ouvertes du milestone (`A PUBLIER` depuis la question, §9.4b) repassent à `DONE` puis sont fermées (§9.5), avant la Phase 6. La validation autorise la clôture du milestone et le
déploiement PROD ; à l'issue du déploiement, les branches résiduelles (milestone, PR mergées) sont supprimées en local et en remote (`deploy.md`, Étape 6).

### 9.8 Blocage et déblocage (`BLOQUE`)

La phase courante est conservée : seul `BLOQUE` est ajouté ou retiré.

```bash
# Blocage — toujours documenter la cause
gh issue comment <numero> --body "⛔ Bloqué — <cause : dépendance, décision, information attendue>"
gh issue edit <numero> --add-label "BLOQUE"

# Déblocage — la phase courante reprend
gh issue edit <numero> --remove-label "BLOQUE"
gh issue comment <numero> --body "▶ Débloqué — <ce qui a levé le blocage>"
```

### 9.9 Abandon (`ABANDONNE`)

Uniquement sur décision de l'utilisateur. Retire tous les labels de phase et `BLOQUE`, puis ferme l'issue.

```bash
gh issue comment <numero> --body "🚫 Abandonné — <raison>"
gh issue edit <numero> --add-label "ABANDONNE" --remove-label "PLANNING,PRET,EN COURS,EN REVIEW,EN QA,PLAN A VALIDER,LOT A VALIDER,A PUBLIER,DONE,BLOQUE"
gh issue close <numero> --reason "not planned"
```

Réouverture : retirer `ABANDONNE`, rouvrir l'issue (`gh issue reopen <numero>`) et reposer `PLANNING`.

### 9.10 Création des labels (si absents du repo)

```bash
gh label create "PLANNING"  --color "c5def5" --description "Plan a elaborer ou a valider"
gh label create "PRET"      --color "bfdadc" --description "Plan valide, developpement pas encore lance"
gh label create "EN COURS"  --color "0075ca" --description "En cours de developpement"
gh label create "EN REVIEW" --color "e4e669" --description "En cours de revue"
gh label create "EN QA"     --color "d93f0b" --description "En cours de validation QA"
gh label edit "A VALIDER" --name "LOT A VALIDER" 2>/dev/null || true   # migration v5.4.0 (label renomme)
gh label create "PLAN A VALIDER" --color "fbca04" --description "Plan rendu, en attente de validation utilisateur (GATE 2)"
gh label create "LOT A VALIDER"  --color "f29513" --description "Lot en QUALIF, en attente de validation utilisateur (GATE LOT)"
gh label create "A PUBLIER"      --color "d4c5f9" --description "Pret pour la PROD, en attente du Oui utilisateur (GATE 4)"
gh label create "DONE"      --color "0e8a16" --description "Implementation validee (QA OK)"
gh label create "BLOQUE"    --color "b60205" --description "Avancement bloque (cause en commentaire)"
gh label create "ABANDONNE" --color "cfd3d7" --description "Abandonnee, ne sera pas traitee"
```

### 9.11 Lots du milestone (`LOT-N`)

Le planner decide du decoupage (table « Lots » du plan) ; le CDP le **recopie** dans l'ordre unique du GATE 2 (§9.0) ;
`deployer` **execute** — c'est le seul acteur qui ecrit des labels (section 9). Les labels de **tous** les lots sont poses
en une fois, apres GATE 2 et avant le premier ordre DEV, jamais lot par lot. Les labels de phase s'appliquent ensuite
par lot. Les lots sont traites **un a la fois**, dans l'ordre (`LOT-1`, `LOT-2`…) : le lot en cours est
`EN COURS`/`EN REVIEW`/`EN QA`/`DONE`/`LOT A VALIDER`, les suivants restent `PRET` jusqu'a la fermeture des issues du lot precedent (CI verte, §9.5b).

Nommage strict `LOT-<entier>` ou `LOT-<entier>.<entier>` (`^LOT-[0-9]+(\.[0-9]+)?$`, sans zero devant) : c'est ce que
reconnait le panneau `milestone-panel` pour construire l'arbre des lots (sous-lots sous leur lot parent, dans l'ordre de
livraison). Chaque issue du milestone porte un seul label de lot.

**Objectif du lot = description du label** : le panneau l'affiche comme titre du lot ou du sous-lot. Les labels
`LOT-n` sont reutilises d'un milestone a l'autre : `deployer` reecrit leur description a chaque GATE 2
(`gh label create … --force`), y compris celle du lot parent d'un decoupage (`LOT-2`, pose sur aucune issue).

**Re-decoupage** (plan revu : issue entrante, GATE 2 repasse) : le CDP envoie un ordre de la meme forme, limite aux
issues dont le lot change ou qui n'en ont pas encore, avec l'objectif de chaque lot nouveau ou modifie
(`Labels lots (GITHUB.md §9.11) : LOT-3 « Tableau de bord » → #21 ; #18 : LOT-2.1 → LOT-2.2`).
Les lots deja livres (issues fermees) ne sont jamais renumerotes ; un nouveau lot prend le numero suivant.

```bash
gh label create "LOT-3" --color "5319e7" --description "Tableau de bord" --force   # lot nouveau ou objectif modifie
gh issue edit <numero> --add-label "LOT-3"                                          # issue entrante
gh issue edit <numero> --add-label "LOT-2.2" --remove-label "LOT-2.1"               # changement de lot
```

### 9.13 Label `VALID-HUMAINE` (validation humaine requise)

Source : ligne `Validation humaine` du `TEST-WRITER DONE` (`agents/test-writer.md`). Au retour du test-writer, le CDP
envoie a `deployer` un ordre unique (`Labels validation humaine (GITHUB.md §9.13) : +VALID-HUMAINE #12 ; -VALID-HUMAINE #15`) ;
`deployer` execute et rapporte `LABELS DONE`. Il recalcule a chaque nouveau `TEST-WRITER DONE` (correctif, re-decoupage §9.11) :
ajout **et** retrait, pour que le label reflete toujours les procedures a jour.

```bash
gh label create "VALID-HUMAINE" --color "fbca04" --description "Validation humaine requise (scenario de test HUMAIN)"   # si absent
gh issue edit <numero> --add-label "VALID-HUMAINE"
gh issue edit <numero> --remove-label "VALID-HUMAINE"
```

Le label est pose avant l'ordre DEV du lot concerne au plus tard (le test-writer est toujours dispatche en Batch 1) ;
sans label au GATE LOT, le lot est auto-valide : le CDP verifie donc le `TEST-WRITER DONE` du lot avant d'auto-valider.

### 9.12 Moment des transitions : au retour du teammate ou a la validation

L'etat dit ou en est l'issue (ce qui reste a faire). Il change donc **des que l'evenement se produit**, avant de
relayer a l'utilisateur et avant tout nouvel ordre — que le teammate ait rendu son travail (`DONE`, `FAILED`,
`BLOQUE`) ou que l'utilisateur ait valide un GATE. Le suivi (issues GitHub, panneau `milestone-panel`) reflete ainsi
l'etat reel meme quand le teamleader attend (GATE, teammate parallele, lot en file).

| Evenement | Labels a appliquer sur les issues concernees |
|-----------|-----------------------------------------------|
| Demande de plan (Phase 1) | `PLANNING` (§ table) |
| Planner `DONE` (plan rendu, GATE 2 pose) | `PLAN A VALIDER` + milestone `⏸ plan a valider`, avant la question (§9.0b) |
| GATE 2 « Ajuster » / « Non » | `PLANNING` (§9.0a) + milestone `▶ en cours — plan a revoir` |
| GATE 2 valide | un seul ordre : `PRET` sur toutes les issues + `LOT-N` de chacune (§9.0, table « Lots » du plan ; retire `PLAN A VALIDER`) + milestone `▶ en cours — plan valide` ; `LABELS DONE` verifie avant le premier ordre DEV |
| Ordre DEV d'un lot | `EN COURS` sur les issues de ce lot (§9.1) |
| DEV `DONE` (tous les dev de l'issue) | `EN REVIEW` (§9.2) |
| TEST-WRITER `DONE` (review parallele) | + `EN QA` (§9.3, `EN REVIEW` conserve) |
| REVIEW `DONE` — verdict OK | retirer `EN REVIEW` (`EN QA` seul) ; en mode sequentiel : `EN QA` (§9.3) |
| REVIEW `DONE` — refus | `EN COURS`, retirer `EN REVIEW` et `EN QA` (§9.1) |
| QA `DONE` — validee | `DONE` (§9.4), puis push et CI |
| Lot deploye en QUALIF, question GATE LOT posee (lot a validation humaine) | `LOT A VALIDER` sur les issues du lot + `LOT-N → ⏸ a valider` et milestone `⏸ LOT-N a valider`, avant la question (§9.4b) ; lot auto-valide : aucun label |
| Lot valide en QUALIF par l'utilisateur (GATE LOT) | `DONE` (§9.4b) + milestone `▶ en cours — LOT-N valide`, puis push et CI (§9.5b) |
| GATE LOT refuse | issues concernees : `EN COURS` / `PLANNING` (§9.6) ; autres issues du lot : `DONE` (§9.4b) |
| Question GATE 4 posee | milestone `⏸ a publier` ; `close_on` = `validation` : `A PUBLIER` sur les issues `DONE` encore ouvertes (§9.4b) |
| CI verte d'un lot | issues du lot fermees (§9.5) ; `EN COURS` sur les issues du lot suivant a son ordre DEV (§9.1) |
| QA `FAILED` / tests en echec | `EN COURS`, retirer `EN QA` et `EN REVIEW` (§9.1) |
| CI verte / non verte | fermeture des issues (`close_on` = `validation` : commentaire seul) / `EN COURS` (§9.5) |
| GATE 4 « Oui » (`close_on` = `validation`) | `A PUBLIER` → `DONE` (§9.4b) puis fermeture des issues encore ouvertes du milestone (§9.5), avant la Phase 6 |
| Teammate `BLOQUE` | ajouter `BLOQUE` + commentaire de cause (§9.8) ; la phase est conservee |
| Blocage leve | retirer `BLOQUE` + commentaire (§9.8) |

Un retour qui ne change aucun label (ex. test-writer `DONE` en mode sequentiel) n'appelle aucun ordre a `deployer`.
L'ordre a `deployer` reste le meme (`SendMessage`, une ligne) et son `DONE` est attendu avant de poursuivre.
