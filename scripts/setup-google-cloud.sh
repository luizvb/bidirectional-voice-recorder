#!/usr/bin/env bash
set -euo pipefail

: "${VOXA_GOOGLE_ACCOUNT:?Set VOXA_GOOGLE_ACCOUNT to the dedicated corporate Google account}"

DEV_PROJECT_ID="${VOXA_GOOGLE_DEV_PROJECT_ID:-voxa-meet-dev}"
PROD_PROJECT_ID="${VOXA_GOOGLE_PROD_PROJECT_ID:-voxa-meet-prod}"

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n 1)"
if [[ "$ACTIVE_ACCOUNT" != "$VOXA_GOOGLE_ACCOUNT" ]]; then
  echo "Active gcloud account is $ACTIVE_ACCOUNT; expected $VOXA_GOOGLE_ACCOUNT." >&2
  echo "Run: gcloud auth login $VOXA_GOOGLE_ACCOUNT" >&2
  exit 1
fi

create_project() {
  local project_id="$1"
  local display_name="$2"
  if ! gcloud projects describe "$project_id" >/dev/null 2>&1; then
    gcloud projects create "$project_id" --name="$display_name"
  fi
  gcloud services enable chromewebstore.googleapis.com --project="$project_id"
}

create_project "$DEV_PROJECT_ID" "Voxa Meet Dev"
create_project "$PROD_PROJECT_ID" "Voxa Meet Production"

gcloud config configurations describe voxa-meet-dev >/dev/null 2>&1 || gcloud config configurations create voxa-meet-dev
gcloud config configurations activate voxa-meet-dev
gcloud config set account "$VOXA_GOOGLE_ACCOUNT"
gcloud config set project "$DEV_PROJECT_ID"

gcloud config configurations describe voxa-meet-prod >/dev/null 2>&1 || gcloud config configurations create voxa-meet-prod
gcloud config configurations activate voxa-meet-prod
gcloud config set account "$VOXA_GOOGLE_ACCOUNT"
gcloud config set project "$PROD_PROJECT_ID"
gcloud config configurations activate voxa-meet-dev

echo "Google Cloud projects are ready. Complete publisher registration, OAuth branding, domain verification, and the first Web Store publication manually."
