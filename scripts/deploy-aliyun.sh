#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/tradepilot}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-.env.production}"
SSH_CMD="${SSH_CMD:-ssh}"
SCP_CMD="${SCP_CMD:-scp}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_NAME="tradepilot-deploy.tar.gz"
LOCAL_ARCHIVE="/tmp/${ARCHIVE_NAME}"

usage() {
  cat <<USAGE
Usage:
  SERVER_HOST=你的阿里云公网IP [SERVER_USER=root] [SSH_KEY=~/.ssh/id_rsa] scripts/deploy-aliyun.sh

Required before running:
  1. cp .env.production.example .env.production
  2. Edit .env.production and replace DEEPSEEK_API_KEY.
  3. Open the selected HOST_PORT in the Aliyun security group, usually port 80.

Optional variables:
  SERVER_PORT=22
  REMOTE_DIR=/opt/tradepilot
  LOCAL_ENV_FILE=.env.production
USAGE
}

if [[ -z "${SERVER_HOST}" ]]; then
  usage
  exit 1
fi

if [[ ! -f "${PROJECT_ROOT}/${LOCAL_ENV_FILE}" ]]; then
  echo "Missing ${LOCAL_ENV_FILE}. Create it first:"
  echo "  cp .env.production.example ${LOCAL_ENV_FILE}"
  echo "Then edit DEEPSEEK_API_KEY and HOST_PORT."
  exit 1
fi

DEPLOY_HOST_PORT="$(grep -E '^HOST_PORT=' "${PROJECT_ROOT}/${LOCAL_ENV_FILE}" | tail -1 | cut -d= -f2- | tr -d "\"'" || true)"
DEPLOY_HOST_PORT="${DEPLOY_HOST_PORT:-80}"

SSH_OPTS=(-p "${SERVER_PORT}" -o ServerAliveInterval=30 -o ServerAliveCountMax=6)
if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
fi
SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"
SCP_OPTS=(-P "${SERVER_PORT}")
if [[ -n "${SSH_KEY}" ]]; then
  SCP_OPTS+=(-i "${SSH_KEY}")
fi

echo "==> Packaging TradePilot"
cd "${PROJECT_ROOT}"
tar \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.deploy.aliyun.local' \
  --exclude='.deploy-sshpass-ssh' \
  --exclude='.deploy-sshpass-scp' \
  --exclude='data/*.sqlite' \
  --exclude='data/*.sqlite-shm' \
  --exclude='data/*.sqlite-wal' \
  -czf "${LOCAL_ARCHIVE}" .

echo "==> Creating remote directory ${REMOTE_DIR}"
"${SSH_CMD}" "${SSH_OPTS[@]}" "${SSH_TARGET}" "mkdir -p '${REMOTE_DIR}'"

echo "==> Uploading package"
"${SCP_CMD}" "${SCP_OPTS[@]}" "${LOCAL_ARCHIVE}" "${SSH_TARGET}:${REMOTE_DIR}/${ARCHIVE_NAME}"

echo "==> Installing Docker if needed, building and starting container"
"${SSH_CMD}" "${SSH_OPTS[@]}" "${SSH_TARGET}" "REMOTE_DIR='${REMOTE_DIR}' ARCHIVE_NAME='${ARCHIVE_NAME}' bash -s" <<'REMOTE'
set -euo pipefail

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  echo "Docker not found, installing..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
  elif command -v yum >/dev/null 2>&1; then
    yum install -y docker docker-compose-plugin || yum install -y docker
  else
    echo "Unsupported Linux distribution. Please install Docker manually."
    exit 1
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo "Docker Compose is missing. Please install docker compose plugin."
    exit 1
  fi
}

install_docker_if_missing
systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker >/dev/null 2>&1 || true

cd "${REMOTE_DIR}"
tar -xzf "${ARCHIVE_NAME}"
mkdir -p data
HOST_PORT_VALUE="$(grep -E '^HOST_PORT=' .env.production | tail -1 | cut -d= -f2- | tr -d "\"'" || true)"
HOST_PORT_VALUE="${HOST_PORT_VALUE:-80}"

COMPOSE="$(compose_cmd)"
${COMPOSE} --env-file .env.production up -d --build

echo "Waiting for app health..."
for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT_VALUE}/api/health" >/dev/null 2>&1; then
    echo "TradePilot is running."
    ${COMPOSE} ps
    exit 0
  fi
  sleep 2
done

echo "App did not pass health check in time. Recent logs:"
${COMPOSE} logs --tail=80 tradepilot
exit 1
REMOTE

echo "==> Done"
if [[ "${DEPLOY_HOST_PORT}" == "80" ]]; then
  echo "Visit: http://${SERVER_HOST}"
else
  echo "Visit: http://${SERVER_HOST}:${DEPLOY_HOST_PORT}"
fi
