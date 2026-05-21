#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-${PROJECT_ROOT}/.deploy.aliyun.local}"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  cat >"${CONFIG_FILE}" <<'CONFIG'
# Local only. Do not commit this file.
SERVER_HOST=39.96.11.116
SERVER_USER=root
SERVER_PORT=22
SERVER_PASSWORD=replace-with-your-server-password
REMOTE_DIR=/opt/tradepilot
LOCAL_ENV_FILE=.env.production
CONFIG
  chmod 600 "${CONFIG_FILE}"
  echo "Created ${CONFIG_FILE}. You can edit it if the server changes."
fi

set -a
source "${CONFIG_FILE}"
set +a

if [[ -z "${SERVER_PASSWORD:-}" ]]; then
  echo "SERVER_PASSWORD is missing in ${CONFIG_FILE}"
  exit 1
fi

if [[ "${SERVER_PASSWORD}" == "replace-with-your-server-password" ]]; then
  echo "SERVER_PASSWORD in ${CONFIG_FILE} is still the default placeholder."
  echo "Edit it first and replace it with the real login password for ${SERVER_USER}@${SERVER_HOST}."
  exit 1
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required for password-based non-interactive deployment."
  echo "Install it first, for example: brew install hudochenkov/sshpass/sshpass"
  exit 1
fi

export SSHPASS="${SERVER_PASSWORD}"

SSH_COMMON_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=6
)

SSH_BIN="${PROJECT_ROOT}/.deploy-sshpass-ssh"
SCP_BIN="${PROJECT_ROOT}/.deploy-sshpass-scp"

cleanup() {
  rm -f "${SSH_BIN}" "${SCP_BIN}"
}
trap cleanup EXIT

cat >"${SSH_BIN}" <<'WRAPPER'
#!/usr/bin/env bash
exec sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=6 "$@"
WRAPPER

cat >"${SCP_BIN}" <<'WRAPPER'
#!/usr/bin/env bash
exec sshpass -e scp -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=6 "$@"
WRAPPER

chmod 700 "${SSH_BIN}" "${SCP_BIN}"

echo "==> Passwordless deploy to ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR:-/opt/tradepilot}"

cd "${PROJECT_ROOT}"
SSH_CMD="${SSH_BIN}" \
SCP_CMD="${SCP_BIN}" \
SSH_KEY="" \
SERVER_HOST="${SERVER_HOST}" \
SERVER_USER="${SERVER_USER:-root}" \
SERVER_PORT="${SERVER_PORT:-22}" \
REMOTE_DIR="${REMOTE_DIR:-/opt/tradepilot}" \
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-.env.production}" \
scripts/deploy-aliyun.sh
