#!/usr/bin/env bash
set -euo pipefail

echo "Starting dfx local replica..."
export PATH="/root/bin:$PATH"

# Start dfx in background
dfx start --background || true

echo "Waiting for replica to become available..."
sleep 4

echo "Deploying canisters..."
dfx deploy --no-wallet || true

echo "Backend container is up. Keeping container alive."
tail -f /dev/null
