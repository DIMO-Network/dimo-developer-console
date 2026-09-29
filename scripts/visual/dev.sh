#!/usr/bin/env bash
# Starts the mock backend (:3001) and the console (:3000) wired to it.
# Process env beats .env.local in Next, so harness.env wins over real config.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/visual/keys.mjs
node scripts/visual/mock-server.mjs &
MOCK=$!
trap 'kill $MOCK 2>/dev/null' EXIT
set -a
source scripts/visual/harness.env
set +a
npx next dev -p 3000
