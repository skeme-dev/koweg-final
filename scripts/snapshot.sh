#!/bin/sh
# Snapshot aus laufender Dev-Instanz exportieren und ins Repo schreiben


if [ -z "$PUBLIC_DIRECTUS_URL" ] || [ -z "$PUBLIC_DIRECTUS_TOKEN" ]; then
  echo "PUBLIC_DIRECTUS_URL or PUBLIC_DIRECTUS_TOKEN not set"
  exit 1
fi

echo "Update snapshot.yaml from $PUBLIC_DIRECTUS_URL"

curl -sf \
  "$PUBLIC_DIRECTUS_URL/schema/snapshot?export=yaml&access_token=$PUBLIC_DIRECTUS_TOKEN" \
  -o snapshot.yaml

echo "snapshot.yaml updated"
