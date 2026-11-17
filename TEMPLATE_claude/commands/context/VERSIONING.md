# VERSIONING.md — Gestion des versions (§5)

> Extrait de `commands/context/COMMON.md` (numérotation conservée, les renvois « COMMON.md §N » restent valables) :
> à lire **seulement** quand la tâche touche le versionnement, le milestone ou un bump de version — pas à chaque commande.

## 5. Gestion des Versions

### 5.1 Fichiers de Version

| Fichier | Champ | Usage |
|---------|-------|-------|
| `{VERSION_FILE}` | `"version"` | Source de verite |

### 5.2 Format et Regles de Versionnement

```
Format dev/qualif : X.Y.Z.a
Format prod       : X.Y.Z   (le "a" n'est jamais publie en prod)
```

| Segment | Role |
|---------|------|
| X | Compatibilite des donnees (DB, fichiers). Fixe par le titre du milestone. |
| Y | Compteur de milestone/livraison. Fixe par le titre du milestone. |
| Z | Compteur de bugfix au sein de la ligne `X.Y`. Fixe par le titre du milestone. |
| a | Compteur de build, gere exclusivement par `deploy` (tache BUILD — agnostique a l'environnement). Les agents `dev-*` ne le touchent jamais. Jamais visible en prod. |

`X.Y.Z` est fixe integralement par le titre du milestone GitHub actif — voir 5.7. Le milestone est la SEULE source de verite pour ces 3 segments ; aucun agent ne les recalcule ni ne les incremente au fil de l'eau. `a` est le seul segment qui bouge pendant le cycle : simple compteur de build, independant des commits dev, incremente uniquement par `deploy` a chaque BUILD.

### 5.3 Cycle de Vie de la Version

| Evenement | Effet |
|-----------|-------|
| Creation du milestone (`/milestone new vX.Y[.Z]`) | Le titre fixe `X.Y.Z` pour tout le cycle — logique complete de validation en 5.7 |
| Ouverture du cycle (1er commit sur la branche rattachee au milestone) | `{VERSION_FILE}` -> `X.Y.Z.0` (version du milestone, `a=0`) |
| BUILD (avant PUBLISH QUALIF) | `a+1` — a la charge de `deploy`, commit dedie `chore(version): Bump to X.Y.Z.a+1`. Seul declencheur de `a` : garantit un artefact unique par build, meme sans nouveau commit dev entre deux builds. Le dossier non gitte `build/candidate_vX.Y.Z/` (sans `a`), toujours a la racine du repo — meme en monorepo, jamais sous un sous-repertoire backend — reste le meme entre deux builds ; c'est le nom de l'artefact a l'interieur (`app-X.Y.Z.a.tar.gz`) qui change. PUBLISH QUALIF promeut ensuite ce candidat vers `build/qualif_vX.Y.Z/` sans le reconstruire (voir `deploy.template.md`) |
| Promotion dev -> prod (`/publish prod`) | `a` est supprime — la version livree est exactement `X.Y.Z`, telle que fixee par le milestone. Aucun calcul. |

> Les commits dev ordinaires (`feat`, `fix`, `refactor`...) ne touchent jamais `{VERSION_FILE}`. `a` s'incremente uniquement au fil des BUILD — plusieurs commits dev peuvent donc s'accumuler sous le meme `a`, et `a` peut s'incrementer plusieurs fois sans aucun nouveau commit dev entre deux builds (ex: rebuild suite a un correctif infra hors code). C'est le comportement attendu.

### 5.4 Regle d'Or — Tout Developpement Rattache a un Milestone

- Il n'existe plus de cycle de developpement hors milestone : toute issue travaillee doit etre associee a un milestone `OPEN`.
- **Aucune issue orpheline** : toute issue est rattachee a un milestone `OPEN` des sa creation — celui precise par l'utilisateur, sinon celui que l'on **recommande** (courant, suivant ou autre) apres analyse de son contenu, valide via `AskUserQuestion` avant `gh issue create`. Jamais de creation sans `--milestone` — voir `context/GITHUB.md` section 2.3.
- **Un seul milestone est en developpement a la fois.** BUGFIX/HOTFIX sans reference explicite
  rejoignent le milestone actif s'il existe (commit direct sur sa branche `milestone/vX.Y.Z`,
  aucune creation) — voir `commands/hotfix.md` et `context/CDP_WORKFLOWS.md` Phase Clarification
  etape 3c.
- **Bug remonte pendant un milestone en cours** : le fix est integre normalement (commit sans toucher `{VERSION_FILE}`), `X.Y.Z` ne bouge pas. Le prochain BUILD incremente `a` automatiquement.
- **Bugfix/hotfix urgent solitaire, aucun milestone actif** : le milestone cible `X.Y.Z+1` (Z+1 par rapport a la derniere version prod livree) est cree automatiquement, sans intervention manuelle prealable — voir `commands/hotfix.md`.
- **Aucune livraison partielle** : la branche milestone part toujours en bloc au deploiement PROD (urgence ou non) — pas de sous-branche par issue, donc pas de cherry-pick propre. Seules les issues **non commencees** (aucun commit) sont reportables sans impact vers le milestone suivant ; celles deja en chantier doivent etre finalisees et validees avant de shipper (voir `context/CDP_WORKFLOWS.md`, Regle "Aucune Livraison Partielle").
- **Une version prod deja depassee n'est jamais repatchee** — le fix cible toujours la ligne prod courante, jamais une ancienne.

### 5.5 Exemple

```
Milestone v1.4.0 cree (X=1, Y=4, Z=0)
1.4.0.0                                (ouverture du cycle)
1.4.0.1                                (1er build — a+1 par deploy)
1.4.0.2                                (rebuild apres correctif — a+1 par deploy)
1.4.0                                  (promotion prod — a supprime, version livree = milestone exact)

Milestone v1.4.1 cree (bugfix solitaire urgent, Z+1 auto)
1.4.1.0 -> 1.4.1.1                     (1 build)
1.4.1                                  (promotion prod)

Milestone v1.5.0 cree (nouvelle feature planifiee)
1.5.0.0 -> 1.5.0.1
1.5.0                                  (promotion prod)
```

### 5.6 Lire la Version

```bash
{VERSION_READ_CMD}
```

### 5.7 Le Milestone comme Source Unique de la Version

Le titre du milestone (`vX.Y.Z` ou `vX.Y.Z — <nom>`, cree par `/milestone new`) fixe integralement la version qui sera livree a la fin du cycle — aucun calcul arithmetique, aucune deduction en fin de course. Le nom apres " — " est purement descriptif (ex: `v1.4.0 — Authentification OAuth2`) : il ne participe a aucune comparaison ni calcul. Toute lecture/comparaison de version porte exclusivement sur le **prefixe** `vX.Y.Z`, jamais sur le titre entier — deux milestones ne peuvent jamais partager le meme prefixe, quel que soit leur nom.

**A la creation (`/milestone new vX.Y[.Z]`)** :
- `X` et `Y` sont obligatoires dans l'argument. S'il en manque un, le demander explicitement avant de continuer (jamais de valeur par defaut, jamais de deduction).
- `Z` est optionnel : rechercher les tags/releases existants pour ce `X.Y`. S'il en existe, prendre le `Z` max trouve + 1 ; sinon `Z=0`.
- Un nom descriptif est ensuite propose en option (ex: "Authentification OAuth2"). S'il est fourni, le titre devient `vX.Y.Z — <nom>` ; sinon `vX.Y.Z` seul. Dans tous les cas le prefixe `vX.Y.Z` est complet — jamais de `Z` implicite.
- Verifier que le prefixe `vX.Y.Z` (complete) n'existe pas deja (ni tag, ni milestone dont le titre est `vX.Y.Z` ou commence par `vX.Y.Z — `) et qu'il est strictement posterieur a la derniere version livree.
- Verifier la coherence avec les labels des issues selectionnees pour ce milestone (mapping labels -> segment, voir `context/GITHUB.md` section 8.3) : avertissement **non-bloquant** si le segment incremente ne correspond pas a la nature des issues (ex: issue `breaking` incluse mais seul `Z` a bouge) — jamais de blocage si l'utilisateur confirme.
- Cette verification labels <-> version se recalcule aussi a chaque ajout d'issue en cours de cycle (`gh issue edit --milestone`), sur l'ensemble des issues **actuellement** associees (jamais en delta par issue ajoutee) — pour rester idempotente et ne pas re-alerter plusieurs fois pour le meme type d'ecart.
- Le titre devient ensuite la reference unique de la version cible pour tout le cycle — il ne change plus, y compris son nom descriptif (voir `commands/milestone.md` Mode NEW).

**A l'ouverture du cycle** :
- `{VERSION_FILE}` est positionne sur `X.Y.Z.0` (version du milestone, `a=0`).

**A la promotion dev -> prod (`/publish prod`)** :
- `a` est supprime de `{VERSION_FILE}`. La version livree est exactement `X.Y.Z` — aucun recalcul, aucune branche conditionnelle.

**A la cloture du milestone (apres deploy PROD reussi)** :
- La description du milestone porte son **historique** (etat, lots, journal date — `context/GITHUB.md` 3.0bis), tenu par `deployer` ; la version livree y est consignee a la cloture (`✅ termine — tag vX.Y.Z`). Cet historique trace l'avancement, il ne fixe aucune version : `X.Y.Z` vient du titre, `a` de `{VERSION_FILE}`.
