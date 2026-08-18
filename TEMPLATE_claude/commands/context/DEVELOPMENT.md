# DEVELOPMENT.md - Patterns de Developpement

Ce fichier centralise les patterns partages par les commandes de developpement (`/dev`, `/dev-backend`, `/dev-frontend`, etc.).

---

## 1. Agents de Developpement

| Commande | Agent | Scope |
|----------|-------|-------|
| `/dev` | Dispatch | Multi-agent |
| `/dev-backend` | dev-backend | Backend uniquement |
| `/dev-frontend` | dev-frontend | Frontend uniquement |

> **Note** : D'autres agents DEV peuvent etre ajoutes selon le projet (firmware, mobile, etc.)

---

## 2. Dispatch Automatique (/dev)

```
Analyser les fichiers du plan :
|-- Fichiers backend -> dev-backend
|-- Fichiers frontend -> dev-frontend
|-- Fichiers firmware -> dev-firmware (si applicable)
|-- Mixte -> Voir section 3
```

---

## 3. Strategie Multi-Agent

### Sequentiel Obligatoire (Backend -> Frontend)

Si le backend cree des elements utilises par le frontend :
- Nouvelles APIs ou endpoints
- Nouveaux modeles de donnees
- Nouveaux evenements temps-reel

```
1. Lancer dev-backend
2. Recuperer le resume (APIs, modeles)
3. Lancer dev-frontend avec le resume
```

### Parallele Autorise

Si modifications isolees :
- Refactoring CSS isole
- Tests unitaires isoles
- Composants sans nouvelles donnees

```
Lancer dev-backend ET dev-frontend en parallele (2 Task tools)
```

---

## 4. Workflow Commun

### Etape 1 : Collecte Contexte

```bash
# Version actuelle
{VERSION_READ_CMD}

# Branche courante
git branch --show-current
```

### Etape 2 : Version (uniquement si nouveau cycle bugfix sans milestone actif)

`a` est un compteur de build QUALIF gere exclusivement par `deploy` — ne jamais l'incrementer ici (voir `context/COMMON.md` section 5). La seule action de version a la charge de DEV est le demarrage d'un cycle bugfix sans milestone actif :

```bash
# Uniquement au 1er commit d'un cycle bugfix sans milestone actif
# X.Y.Z.a -> X.Y.(Z+1).0  (voir context/COMMON.md section 5.3)
git add {VERSION_FILE}
git commit -m "chore(version): Start bugfix cycle X.Y.Z+1.0"
```

Dans tous les autres cas (feature planifiee, commits suivants d'un cycle deja demarre), ne pas toucher `{VERSION_FILE}`.

### Etape 3 : Implementer

Voir ordre par agent dans `context/PROJECT_CONTEXT.md`.

### Etape 4 : Build Final

```bash
{BUILD_CMD}
```

### Etape 5 : Verifications

```bash
# Tests
{TEST_CMD}

# Push
git push origin <branche>
```

### Etape 6 : Generer Resume

```markdown
## Resume DEV

**Fichiers modifies :**
- [liste]

**Tests crees :**
- [liste]

**Commits :**
- [liste]

**Pour Frontend (si backend) :**
- APIs : [liste]
- Modeles : [liste]
```

---

## 5. Regles Critiques

| Regle | Detail |
|-------|--------|
| Version first | Incrementer a AVANT tout code |
| Scope strict | Chaque agent reste dans son domaine |
| Tests | Chaque fonction publique = tests |
| Commits | Atomiques, 1 commit par tache logique |

---

## 6. Modes d'Appel

```bash
# Plan complet
/dev [plan detaille]

# Backend seul
/dev backend [plan backend]
/dev-backend [plan]

# Frontend seul
/dev frontend [plan frontend]
/dev-frontend [plan]

# Bugfix
/dev fix "description du bug"

# Post-review
/dev review "corrections demandees"
```

---

## Usage

Dans les commandes DEV, referencer ce fichier :

```markdown
**Contexte DEV :** Voir `context/DEVELOPMENT.md`
- Workflow : section 4
- Regles : section 5
- Modes d'appel : section 6
```
