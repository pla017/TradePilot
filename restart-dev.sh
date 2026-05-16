#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

pid="$(lsof -tiTCP:3000 -sTCP:LISTEN || true)"
if [[ -n "${pid}" ]]; then
  echo "Stopping old TradePilot server on port 3000: ${pid}"
  kill ${pid} || true
  sleep 1
fi

echo "Starting TradePilot with SQLite and DeepSeek config..."
npm run dev
