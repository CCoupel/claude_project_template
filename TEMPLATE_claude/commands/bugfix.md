# Commande /bugfix

Workflow pour la correction d'un bug.

## Usage

```
/bugfix <description du bug>
```

## Argument recu

$ARGUMENTS

## Mots-cles de controle

**Reference :** Voir `context/COMMON.md` section 12

| Mot-cle | Action |
|---------|--------|
| `help` | Affiche l'aide et les mots-cles disponibles |
| `status` | Affiche l'etat du workflow en cours |
| `plan` | Affiche le plan sans executer |
| `resume <phase>` | Reprend a une phase |
| `skip <phase>` | Saute une phase |
| `jumpto <tache>` | Demarre a une tache precise du plan |

Si `$ARGUMENTS` commence par un mot-cle -> executer l'action correspondante.
Sinon -> workflow normal.

## Workflow

```
/bugfix <description>
    |
    v
[CLARIFICATION] --> Etude spec + issues GitHub + questions si besoin
    |
    v
[ANALYSE] --> Identifier la cause racine
    |
    v
[PLAN] --> Plan de correction (si complexe)
    |
    v
[TEST-WRITER] --> test de reproduction (statut `regression`)
    |
    v
[RED CHECK] --> qa : le test doit ECHOUER sur le code non corrige
    |
    v
[DEV] --> Implementation du fix
    |           |
    v           v
[REVIEW]     [QA] --> reproduction (vert) + NR du composant, en parallele de REVIEW (defaut)
    |           |
     `----+-----'
          v
       [DOC] --> CHANGELOG (Fixed)
    |
    v
[BUILD] --> Compilation candidat
    |
    v
[PUBLISH QUALIF] --> Mise a disposition QUALIF
    |
    v
[DEPLOY QUALIF] --> Installation QUALIF (PROD sur /deploy prod)
```

## Etapes Detaillees

### 1. ANALYSE

- Explorer le code pour comprendre le probleme
- Identifier le(s) fichier(s) concerne(s)
- Reproduire le bug si possible
- Determiner la cause racine

### 2. PLAN (optionnel)

Pour les bugs complexes uniquement :
- Plusieurs fichiers impactes
- Risque de regression
- Changement d'architecture

### 3. DEV

- Correction minimale et ciblee
- Eviter les changements non lies au bug
- Ajouter des commentaires si logique complexe

### 4. TEST-WRITER puis RED CHECK (avant le DEV)

**Obligatoire** : test de reproduction ecrit par test-writer, **avant** le fix
- Script qui reproduit le bug (red avant le fix, green apres), enregistre au statut `regression` dans `tests/INDEX.md`
- Procedure manuelle dans `tests/procedures/` pour que QA valide le scenario
- **RED CHECK** : QA execute ce seul test sur le code non corrige (`Scope : red-check`) — il doit echouer. S'il passe, il ne reproduit pas le bug : retour au test-writer (hors comptage de cycles)

### 5. REVIEW

- Verification que le fix est correct
- Pas d'effets de bord
- Code propre et maintenable

### 6. QA

- Test de reproduction (doit maintenant passer), puis NR impactees du composant (`context/COMMON.md` section 15)
- Verification specifique du scenario du bug
- Build OK
- Par defaut, demarre des que TEST-WRITER a livre ses scripts — en parallele de REVIEW, sans attendre son
  verdict (voir `context/QUALITY.md` section 12). Repli sequentiel si le risque est juge eleve.

### 7. DOC

Mise a jour CHANGELOG.md :
```markdown
### Fixed
- Description du bug corrige (#issue)
```

## Exemples

```
/bugfix Le score ne s'affiche pas apres une partie
/bugfix Crash au demarrage sur iOS 15
/bugfix L'API retourne 500 sur /users sans parametres
/bugfix Le bouton submit reste desactive apres erreur
```

## Differences avec /hotfix

| Aspect | /bugfix | /hotfix |
|--------|---------|---------|
| Urgence | Normal | Critique (prod down) |
| Tests | Reproduction (red check) + NR du composant ; NR complete en parallele de QUALIF | Reproduction + `smoke`/`critical` ; NR complete apres PROD |
| Review | Standard | Acceleree |
| Deploy | Via workflow normal (BUILD+PUBLISH+DEPLOY QUALIF puis PROD) | Direct PROD (BUILD+PUBLISH+DEPLOY PROD, sans QUALIF) |

## Prompt a transmettre au CDP

Orchestre le workflow BUGFIX pour {PROJECT_NAME}.

**Contexte projet :** Voir `context/COMMON.md` section 1
**Workflow CDP :** Voir `context/CDP_WORKFLOWS.md`
- Type : BUGFIX
- Phases : section 3
- Clarification : section 4
- Labels GitHub : section 5 (Labels GitHub — Suivi de Phase) — appliquer les MCP calls à chaque transition de phase
- Dispatch PLAN : section 5 (Phase Plan) — si bugfix complexe, déléguer au planner via SendMessage
- Dispatch DEV : section 5 (Phase Dev)
- Validation : section 6
- Erreurs : section 7
- Regles : section 9

**Contexte DEV :** Voir `context/DEVELOPMENT.md`
**Contexte Qualite :** Voir `context/QUALITY.md` (dispatch Review/QA parallele par defaut : section 12)

**Demande utilisateur :** $ARGUMENTS

## Agent

Délègue au teamleader (`teamleader.md`) en mode bugfix.
