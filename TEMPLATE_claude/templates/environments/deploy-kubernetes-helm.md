# Deploy — {ENV_NAME} (mecanisme : kubernetes/helm)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-kubernetes-helm.md` —
> selectionne car `infrastructure.environments[].deploy.mechanism` vaut `"kubernetes"` ou
> `"helm"` pour {ENV_NAME} dans `.claude/project-config.json`. Charge par `agents/deploy.md`,
> Tache DEPLOY {ENV_NAME}, etape [2. MECANISME]. Chart/values : `{DEPLOY_TARGET}`.

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3). BORE : jamais de rebuild, jamais
de retag qui re-uploaderait un nouveau contenu.

## Variables attendues

| Variable | Usage |
|----------|-------|
| `KUBE_CONTEXT` | Contexte kubectl a selectionner pour {ENV_NAME} (cluster/namespace) |
| `KUBECONFIG` | Optionnel — chemin vers le kubeconfig si different de celui par defaut du poste |

Namespace (`access.namespace`), contexte (`access.context`, a defaut `KUBE_CONTEXT`) et ressources a mettre a jour (`deploy.services`, optionnel : deployments concernes, defaut `app`) viennent de `project-config.json` (`/init-project` Etape 8b) — les autres workloads du namespace ne sont jamais touches.

```bash
ENV_JSON=$(jq -c --arg n "{ENV_NAME}" '.infrastructure.environments[] | select(.name==$n)' .claude/project-config.json)
acc() { echo "$ENV_JSON" | jq -r ".access.$1 // empty"; }   # coordonnees validees au cadrage (/init-project Etape 8b)
KUBE_CONTEXT=${KUBE_CONTEXT:-$(acc context)}; NS=$(acc namespace); NS=${NS:-default}
SERVICES=$(echo "$ENV_JSON" | jq -r '(.deploy.services // ["app"]) | join(" ")')

# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION — confirmee par le teamleader/le
# rapport PUBLISH DONE avant cet ordre.
kubectl config use-context "$KUBE_CONTEXT"

# 2. Install
helm upgrade --install app {DEPLOY_TARGET} --kube-context "$KUBE_CONTEXT" -n "$NS" --set image.tag=$VERSION -f custom-values.yaml
# ou, sans Helm, uniquement les deployments listes :
#   for s in $SERVICES; do kubectl -n "$NS" set image deployment/$s $s={PUBLISH_TARGET}:$VERSION; done

# 3. Verifier le rollout
ROLLOUT_STATUS=0
for s in $SERVICES; do kubectl -n "$NS" rollout status deployment/$s --timeout=5m || ROLLOUT_STATUS=$?; done
```

**ROLLOUT_STATUS = 0 → continuer vers Notification.**

**ROLLOUT_STATUS ≠ 0 → executer le protocole d'echec ci-dessous.**

## Echec

Le deployer ne corrige rien lui-même. Il rollback l'infra, et remonte au teamleader. La publication
(PUBLISH {ENV_NAME}) ayant déjà réussi, un échec ici est toujours un échec
d'installation/rollout — jamais un échec de code ni de build.

```
SendMessage({
  to: "team-lead",
  content: "DEPLOY FAILED
Environnement : {ENV_NAME}
Version  : v[X.Y.Z]
Etape    : Installation
Rollback : rollout undo"
})
```

```bash
# 4. Notification (si ROLLOUT_STATUS = 0)
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Rollback

```bash
for s in $SERVICES; do kubectl -n "$NS" rollout undo deployment/$s; done
# ou (Helm) :
helm rollback app -n "$NS"
```
