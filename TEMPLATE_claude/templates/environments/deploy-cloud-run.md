# Deploy — {ENV_NAME} (mecanisme : cloud-run)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-cloud-run.md` — selectionne car
> `infrastructure.environments[].deploy.mechanism = "cloud-run"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Cible : `{DEPLOY_TARGET}` (ex: nom du service Cloud Run / App Engine).

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `GCP_PROJECT` | Projet GCP cible (a defaut `access.project` de `project-config.json`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optionnel — chemin vers la cle de service account, si `gcloud auth` n'est pas deja configure sur le poste |

Region (`access.region`, defaut `europe-west1`) : `project-config.json` (`/init-project` Etape 8b).

```bash
ENV_JSON=$(jq -c --arg n "{ENV_NAME}" '.infrastructure.environments[] | select(.name==$n)' .claude/project-config.json)
acc() { echo "$ENV_JSON" | jq -r ".access.$1 // empty"; }   # coordonnees validees au cadrage (/init-project Etape 8b)
GCP_PROJECT=${GCP_PROJECT:-$(acc project)}; REGION=$(acc region); REGION=${REGION:-europe-west1}

# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION.

# 2. Install
gcloud run deploy {DEPLOY_TARGET} --image "{PUBLISH_TARGET}:$VERSION" --project "$GCP_PROJECT" --region "$REGION"
# ou (App Engine) : gcloud app deploy --image-url="{PUBLISH_TARGET}:$VERSION" --project "$GCP_PROJECT"

# 3. Verification post-deploy
# Smoke : commande du projet (tests tag `smoke` de tests/INDEX.md), sinon simple /health
SMOKE_CMD=$(jq -r '.commands.smoke // empty' .claude/project-config.json)
if [ -n "$SMOKE_CMD" ]; then bash -c "$SMOKE_CMD"; else curl -f "https://{ENV_NAME_LOWER}.example.com/health"; fi

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

```bash
gcloud run services logs read {DEPLOY_TARGET} --project "$GCP_PROJECT" --region "$REGION" --limit 50
```

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Rapport au teamleader, jamais de correction autonome.

## Rollback

```bash
gcloud run services update-traffic {DEPLOY_TARGET} --to-revisions=PREVIOUS=100 --project "$GCP_PROJECT" --region "$REGION"
```
