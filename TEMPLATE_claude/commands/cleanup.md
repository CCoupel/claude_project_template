# Commande /cleanup

Faire le ménage dans les fichiers du projet : fichiers temporaires, anciens builds, caches, fichiers inutiles.
La commande **propose** (scan en lecture seule, classé par niveau de sûreté) et ne supprime que ce que
l'utilisateur a validé.

## Usage

```
/cleanup [scope]
```

## Argument recu

$ARGUMENTS

| Scope | Description |
|-------|-------------|
| (vide) | Scan complet, toutes les catégories |
| `tmp` | Temporaires et déchets d'éditeur/OS (catégorie T) |
| `build` | Artefacts de build et anciennes releases (catégories B, R) |
| `cache` | Caches régénérables (catégorie C) |
| `work` | Dossier de travail `_work/` (catégorie W) |
| `--session` | Mode appelé par `/end-session` : pas de catégorie W (déjà purgée par l'étape 6), une seule question |

Le mode `--session` se combine avec un scope (`/cleanup --session build`). Appelée par `/end-session`, la commande
s'exécute sans argument utilisateur, avec `--session`.

## Quand l'utiliser

- Fin de session (automatique via `/end-session`, étape 4ter, après le contrôle git)
- Après une série de builds / tests qui ont laissé des artefacts
- Avant un changement de contexte, une archive du dossier, ou un `/init-project` de synchronisation
- Dossier de projet qui gonfle (voir la taille par catégorie dans le rapport)

## Workflow

```
/cleanup
    |
    v
[SCAN] --> deployer : CLEANUP SCAN (lecture seule : candidats, taille, classe SURE / A_ARBITRER / SIGNALE)
    |
    v
[PROPOSITION] --> Tableau par catégorie (fichiers, taille, motif de chaque proposition)
    |
    v
[VALIDATION] --> AskUserQuestion : catégories SURE à supprimer, puis chaque A_ARBITRER (NE RIEN supprimer avant)
    |
    v
[APPLICATION] --> deployer : CLEANUP APPLY (liste exacte validée, re-vérification, suppression, commit si fichiers suivis)
    |
    v
[RAPPORT] --> Fichiers supprimés, espace libéré, ce qui a été conservé ou signalé
```

## Delegation

Le teamleader **coordonne et questionne** ; il n'exécute aucun `Bash` ni `rm` (CLAUDE.md « Délégation Stricte »).
Le scan et la suppression sont des ordres à `deployer` (`agents/deploy.md` « Tache CLEANUP »), toujours présent
(`socle`). **Aucune team active** (session sans `/start-session`) : la commande ne peut pas s'exécuter — le dire
(« relancer `/start-session` puis `/cleanup` ») ; appelée par `/end-session`, le signaler au rapport.

| Besoin | Ordre | Agent |
|---|---|---|
| Inventaire des candidats (lecture seule) | `CLEANUP SCAN : <scope> [--session]` | `deployer` |
| Suppression de la liste validée | `CLEANUP APPLY : <liste>` | `deployer` |

## Filet de sécurité git (prérequis)

`/cleanup` s'exécute **après un `git push`** : tout fichier suivi supprimé par erreur se récupère depuis l'historique
(`git checkout origin/<branche> -- <chemin>`). Le scan (`deployer`) vérifie ce prérequis (« PUSH CHECK ») et le
remonte en tête du `DONE` :

| Etat | Fichiers non suivis / ignorés | Fichiers suivis |
|---|---|---|
| Arbre propre **et** `HEAD` poussé (`git rev-list @{u}..HEAD` vide, branche avec upstream) | proposés | proposés (`A_ARBITRER`), chaque fichier est dans un commit de `origin` → récupérable |
| Commits locaux non poussés, ou pas d'upstream | proposés (git ne les protège pas de toute façon) | **non proposés** : classés `SIGNALE` « pousser d'abord, puis relancer `/cleanup` » |
| Modifications non commitées sur le fichier suivi | proposés | jamais proposé (la modification serait perdue, hors historique) |

Les fichiers non suivis ou ignorés ne sont **pas** couverts par ce filet : c'est pourquoi ils sont limités aux
fichiers régénérables (liste de protection ci-dessous). Le push lui-même n'est jamais fait par `/cleanup`
(`context/COMMON.md` 7.1) : il a lieu au passage des issues en `DONE`.

## Catégories

Chaque candidat reçoit une **classe** (même vocabulaire que le classement des branches, `end-session.md` 4bis) :

| Classe | Signification | Action |
|---|---|---|
| `SURE` | Non suivi par git **et** régénérable sans perte (ignoré, ou déchet connu) | Proposer la suppression |
| `A_ARBITRER` | Suivi par git, volumineux à régénérer, ou périmètre incertain | Ne jamais supprimer sans accord explicite, élément par élément |
| `SIGNALE` | Anormal mais pas du ressort du ménage (gros fichier suivi, secret probable, doublon) | Rapport uniquement, jamais supprimé |

| Cat. | Contenu | Détection | Classe par défaut |
|---|---|---|---|
| **T** — Temporaires | `*.tmp`, `*.temp`, `*.swp`, `*.swo`, `*~`, `*.orig`, `*.rej`, `*.bak`, `.DS_Store`, `Thumbs.db`, `nohup.out`, `core`, `core.*`, `*.log` (hors `logs/` versionné), `*.pid` périmés | `find` + non suivi (`git ls-files --error-unmatch` en échec) | `SURE` si non suivi ; suivi → `A_ARBITRER` |
| **B** — Builds | Sorties de build de la stack (`dist/`, `build/`, `out/`, `target/`, `bin/`/`obj/` .NET, `.next/`, `.nuxt/`, `.pio/`, `.build/`, `releases/`, `*.o`, `*.class`, binaires compilés...) | Liste de la stack depuis `project-config.json` (`commands.build`, composants) + répertoires ci-contre **seulement s'ils sont gitignorés** | `SURE` si ignoré ; suivi → `A_ARBITRER` (proposition `git rm`) |
| **R** — Anciennes releases | Artefacts versionnés dans un dossier de releases : on garde les `N` plus récents (défaut `N=2`) et la version courante (`VERSION_FILE`) | Tri par version SemVer du nom ou, à défaut, par date | `SURE` si ignoré ; suivi → `A_ARBITRER` |
| **C** — Caches | `__pycache__/`, `*.pyc`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.cache/`, `.parcel-cache/`, `.turbo/`, `.gradle/`, coverage (`.coverage`, `htmlcov/`, `coverage/`) | Répertoires/fichiers ignorés | `SURE` |
| **D** — Dépendances | `node_modules/`, `.venv/`, `vendor/` (reinstallation longue ou réseau requis) | Ignoré | `A_ARBITRER` — jamais proposé en mode `--session` |
| **E** — Vides | Répertoires vides (hors `.git/`, `.gitkeep` contenant un répertoire voulu) | `find -type d -empty` | `SURE` si non suivi |
| **W** — Travail `_work/` | `_work/tmp/`, `_work/tasks/` périmés ; tout `_work/` si aucun workflow en cours | Règle de la purge `end-session.md` étape 6 (`workflow-state.json`) ; maquettes et rapports conservés tant que le workflow vit | `SURE` |
| **X** — Anomalies | Fichier suivi > 5 Mo, fichier de secret probable (`.env`, `*.pem`, `id_rsa`, `*credentials*`) suivi, doublon exact (hash) de gros fichiers | `git ls-files` + `du` | `SIGNALE` |

### Jamais touché (liste de protection, vérifiée à la proposition **et** re-vérifiée à l'application)

- `.git/`, `.github/`, `.claude/` (agents, commandes, mémoire, `workflow-state.json`, `settings*.json`), `TEMPLATE_claude/`,
  `.claude-launcher/`, `PRIVATE/`, `MARKETING/` et tout worktree (`git worktree list`)
- Tout fichier suivi par git **sans** accord explicite élément par élément (classe `A_ARBITRER`)
- Fichiers non suivis **non ignorés** (probable travail en cours) : jamais supprimés par `/cleanup` ; listés dans le
  rapport (« non suivis, non ignorés — à commiter ou à ajouter à `.gitignore` ») sans proposition de suppression
- Fichiers de configuration locale : `.env*`, `*.local`, `*.key`, `*.pem`, bases de données de dev (`*.db`, `*.sqlite*`)
  et dossiers `data/` — même ignorés, ils peuvent contenir des données non régénérables
- Tout chemin qui sort du dépôt (lien symbolique, `..`) — les liens symboliques sont supprimés comme liens, jamais suivis

## Etapes Detaillees

### 1. SCAN — Inventaire (lecture seule)

Ordre à `deployer` (fichier `_work/tasks/deployer-<timestamp>.md`, ordre de plus de 3 lignes) :
`CLEANUP SCAN : <scope> [--session]`. Le `DONE` contient, par catégorie, la liste `classe | chemin | taille | motif`,
les totaux, et les anomalies (X). Aucune suppression, aucune écriture. Définition de la tâche et script de
détection : `agents/deploy.md` « Tache CLEANUP ».

### 2. PROPOSITION — Présentation

Afficher un tableau lisible avant toute question :

```
🧹 Ménage proposé — 142 Mo récupérables

 Cat.  Contenu                          Fichiers   Taille   Classe
 T     Temporaires (*.tmp, *.bak, ...)        9    1,2 Mo   SURE
 B     Builds (dist/, server-go/releases/)   34  118  Mo   SURE
 R     Anciennes releases (garde v1.4, v1.3)   6   21  Mo   SURE
 C     Caches (__pycache__, .pytest_cache)  310    1,8 Mo   SURE
 D     Dépendances (node_modules/)        41200  410  Mo   A_ARBITRER
 W     _work/ (workflow terminé)              58    0,4 Mo   SURE
 X     Anomalie : assets/demo.mov suivi, 38 Mo           SIGNALE

 Conservé d'office : .env, data/, PRIVATE/, 3 fichiers non suivis non ignorés (cf. rapport)
```

Chaque catégorie est dépliable à la demande (le teamleader relit le `DONE` ; il n'affiche le détail fichier par
fichier que si l'utilisateur le demande, sauf pour `A_ARBITRER` où le chemin exact est montré dans la question).

Rien à proposer → `✅ Projet propre — rien à nettoyer` et passer au rapport.

### 3. VALIDATION — AskUserQuestion

Jamais en texte, **aucune suppression avant la réponse**.

1. **Catégories `SURE`** — une question `multiSelect: true` : `"Supprimer ces catégories ? (<total> récupérables)"`,
   une option par catégorie (1 à 4 ; au-delà, regrouper les plus petites dans « Petites catégories (T, C, E) » ou
   proposer **Tout supprimer (SURE)** (Recommandé) / **Ne rien supprimer**). Chaque option précise le nombre de
   fichiers et la taille. Mode `--session` : **une seule question**, options **Tout supprimer (SURE)** (Recommandé) /
   **Choisir** / **Ne rien supprimer** ; `A_ARBITRER` et `SIGNALE` ne sont pas posés, ils vont au rapport.
2. **Éléments `A_ARBITRER`** (hors `--session`) — jusqu'à 3 questions dans le même appel, une par élément ou groupe
   homogène : `"<chemin> : suivi par git (<taille>) — que faire ?"` — options : **Conserver** (Recommandé) /
   **Supprimer** (`git rm`, récupérable depuis `origin`) ; pour `D` : **Conserver** / **Supprimer (réinstallation
   requise)**. Les suivants vont au rapport.

La question de validation contient le **chemin** de la liste complète si elle est longue : le `DONE` du scan est
copié dans `_work/cleanup-plan.md` (gitignoré) et ce chemin figure dans la question (`context/COMMON.md` §0).

### 4. APPLICATION — Suppression

Ordre à `deployer` : `CLEANUP APPLY : <liste exacte des chemins validés>` — jamais un motif (`*.log`) ni une
catégorie : la liste validée, rien d'autre. `deployer` re-vérifie chaque chemin (protection, non suivi/ignoré, existe
toujours, inchangé depuis le scan), supprime, et :

- **Fichiers non suivis / ignorés** : suppression simple, aucun commit.
- **Fichiers suivis validés** (`A_ARBITRER`, PUSH CHECK ok) : `git rm`, puis `SESSION COMMIT : chore(cleanup): <résumé>`
  (conventionnel, **sans push**, `context/COMMON.md` 7.1).

Le `DONE` liste ce qui a été supprimé, ce qui a été ignoré (motif : devenu protégé, modifié depuis le scan, absent)
et l'espace réellement libéré.

### 5. RAPPORT

```markdown
## Rapport de nettoyage — <date>

**Supprimé** : <N> fichiers, <taille> libérés (T: 9, B: 34, C: 310, W: 58)
**Conservé sur décision** : <chemin> (suivi, A_ARBITRER)
**Ignoré à l'application** : <chemin> — <motif>
**Signalé** : assets/demo.mov (38 Mo suivi) — à traiter à la main (Git LFS ? suppression de l'historique ?)
**Non suivis, non ignorés** : <N> fichiers — à commiter ou à ajouter au `.gitignore`
**Pour la prochaine fois** : <suggestion : ajouter `dist/` au .gitignore, etc.>
```

Si un motif de nettoyage revient souvent (artefacts suivis qui devraient être ignorés), suggérer l'ajout au
`.gitignore` dans « Pour la prochaine fois » — le teamleader ne le modifie pas lui-même.

## Exemple

```
/cleanup

[SCAN] deployer CLEANUP SCAN : 412 candidats, 142 Mo ✅
🧹 Ménage proposé — T 1,2 Mo · B 118 Mo · R 21 Mo · C 1,8 Mo · W 0,4 Mo (SURE) — D 410 Mo (A_ARBITRER) — X 1 anomalie
[VALIDATION] Tout supprimer (SURE) ; node_modules conservé
[APPLICATION] deployer CLEANUP APPLY : 412 fichiers supprimés, 142 Mo libérés ✅

--- Rapport de nettoyage ---
Supprimé : 412 fichiers, 142 Mo — Signalé : assets/demo.mov (38 Mo suivi)
```

## Agent

Le teamleader coordonne et pose les questions ; le scan et la suppression sont délégués à `deployer`
(voir « Delegation »).
