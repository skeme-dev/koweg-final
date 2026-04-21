#!/bin/sh
set -e

node /directus/cli.js start &
DIRECTUS_PID=$!

until wget -q --spider http://127.0.0.1:8055/server/health 2>/dev/null; do
  sleep 2
done

echo "📐 Applying schema..."
npx directus schema apply --yes /directus/snapshot.yaml

wait $DIRECTUS_PID