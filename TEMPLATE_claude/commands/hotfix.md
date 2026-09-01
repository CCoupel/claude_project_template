# Commande /hotfix

Workflow accelere pour les corrections critiques en production.

## Usage

```
/hotfix <description du probleme critique>
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

## Quand utiliser

- Production cassee ou degradee
- Faille de securite active
- Perte de donnees en cours
- Impact business majeur

## Workflow Accelere

```
/hotfix <description>
    |
    v
[ANALYSE RAPIDE] --> Identification immediate
    |                 (pas de plan detaille)
    v
[FIX] --> Correction minimale
    |
    v
[TESTS CRITIQUES] --> Uniquement les tests essentiels
    |
    v
[DEPLOY PROD] --> Deploiement direct
    |
    v
[POST-MORTEM] --> Documentation de l'incident
```

## Etapes Detaillees

### 1. ANALYSE RAPIDE (max 15 min)

- Identifier le symptome exact
- Localiser le code responsable
- Determiner le fix minimal

**Pas de plan detaille** - On agit vite.

### 1bis. MILESTONE (automatique)

Tout developpement est rattache a un milestone — voir `context/COMMON.md` section 5.4. Un seul
milestone est en developpement a la fois (regle d'or) — le hotfix ne cree jamais de milestone
parallele a un cycle deja en cours.

```bash
gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.state=="open")'
```

- **Un milestone actif existe** -> le hotfix s'y integre directement (aucune creation). Le fix
  sera commite sur sa branche `milestone/vX.Y.Z`, au meme titre qu'un bugfix — voir
  `context/CDP_WORKFLOWS.md` Phase Init (Git).
- **Aucun milestone actif** -> creer automatiquement le milestone dedie `X.Y.Z+1` (Z+1 sur la
  derniere version prod livree), sans validation utilisateur prealable (urgence prod) — logique
  de `/milestone new` (`commands/milestone.md` Mode NEW, `context/COMMON.md` section 5.7).
  `{VERSION_FILE}` est positionne sur `X.Y.Z+1.0`.

### 2. FIX

- Correction la plus simple possible
- Un seul commit
- Pas de refactoring
- Pas de features supplementaires

### 3. TESTS CRITIQUES

Uniquement :
- Test du scenario casse
- Smoke tests de base
- Build OK

**Pas de suite complete** - Sera fait apres.

### 4. DEPLOY PROD

Le fix est deja commite directement sur la branche du milestone actif (etape 1bis) — HOTFIX ne
cree plus sa propre branche isolee, il rejoint `milestone/vX.Y.Z` comme FEATURE/BUGFIX/REFACTOR
(voir `context/CDP_WORKFLOWS.md` Phase Init (Git)) :

```bash
git commit -m "fix: <description>"
```

**Avant de continuer — Regle "Aucune Livraison Partielle"** (`context/CDP_WORKFLOWS.md`, section
Phase Versionnement) : si d'autres issues du meme milestone sont deja en chantier sur cette
branche (commits presents, pas encore DONE), elles partent **aussi** en prod avec ce hotfix —
il n'existe aucun moyen de les exclure proprement (pas de sous-branche par issue, donc pas de
cherry-pick propre entre commits valides et commits en cours). Si elles ne peuvent pas etre
finalisees a temps, l'urgence du hotfix force a les valider en priorite (Review + QA accelerees)
avant de deployer — jamais de contournement.

Deploiement, mecanique identique a `agents/deploy.md` Workflow PROD (push de la branche
milestone, merge `--no-ff` vers `main`, tag `vX.Y.Z`, suivi CI, nettoyage remote de la branche
a l'Etape 8 en cas de succes) — dispatcher `deployer` avec l'ordre PROD.

**Preparation marketing — dispatch systematique en parallele, comme pour tout deploiement PROD**
(voir `agents/cdp.template.md` Phase 6, meme mecanique GATE 4d / PUBLISH) : `CLEAR(marketing)`
puis `SendMessage({ to: "marketing", content: "PREPARE v[X.Y.Z]" })` dans le meme tour que le
dispatch `deployer`. Le hotfix peut embarquer plus que le simple correctif (regle "Aucune
Livraison Partielle" ci-dessus) — c'est l'agent marketing qui decide seul, sur le contenu reel
du milestone, s'il y a matiere a publier.

### 5. POST-MORTEM

Apres le fix, documenter :

```markdown
## Incident Report

**Date** : YYYY-MM-DD HH:MM
**Duree** : X heures
**Impact** : Description de l'impact

### Chronologie
- HH:MM - Detection du probleme
- HH:MM - Debut d'investigation
- HH:MM - Fix deploye
- HH:MM - Service restaure

### Cause Racine
Description technique de la cause.

### Fix Applique
Description du fix.

### Actions Preventives
- [ ] Action 1
- [ ] Action 2

### Lecons Apprises
- Point 1
- Point 2
```

## Exemples

```
/hotfix Base de donnees saturee, requetes timeout
/hotfix Faille XSS sur le formulaire de login
/hotfix Crash API suite au dernier deploy
/hotfix Certificat SSL expire
```

## Apres le Hotfix

1. **Tests complets** en background
2. **Revue de code** post-mortem
3. **Communication** a l'equipe

## Regles Critiques

1. **Fix minimal** - Pas le moment d'ameliorer
2. **Un seul probleme** - Un hotfix = un bug
3. **Documenter** - Pour ne pas reproduire
4. **Communiquer** - Equipe informee
5. **Valider** - Monitoring post-deploy

## Prompt a transmettre au CDP

Orchestre le workflow HOTFIX pour {PROJECT_NAME}.

**Contexte projet :** Voir `context/COMMON.md` section 1
**Workflow CDP :** Voir `context/CDP_WORKFLOWS.md`
- Type : HOTFIX
- Phases : section 3
- Dispatch DEV : section 5
- Validation : section 6
- Erreurs : section 7
- Regles : section 9

**Contexte DEV :** Voir `context/DEVELOPMENT.md`

**Demande utilisateur :** $ARGUMENTS

## Agent

Délègue au Claude principal (main) (`teamleader.md`) en mode hotfix (étapes réduites).
