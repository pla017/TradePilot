#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ACTION="${1:-start}"
NODE_BIN="${NODE_BIN:-node}"
PID_DIR="${PID_DIR:-$ROOT_DIR/.run}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.logs}"
PID_FILE="${PID_FILE:-$PID_DIR/tradepilot.pid}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/tradepilot.log}"
AUTO_OPEN="${AUTO_OPEN:-1}"

load_env_file() {
  local file="$1"

  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" != *=* ]] && continue

    local key value
    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | xargs)"
    value="$(printf '%s' "$value" | sed -e "s/^['\"]//" -e "s/['\"]$//")"

    if [[ -z "${!key:-}" ]]; then
      export "${key}=${value}"
    fi
  done < "$file"
}

for env_file in .env.local .env; do
  load_env_file "$env_file"
done

PORT="${PORT:-${HOST_PORT:-3000}}"
HOST="${HOST:-127.0.0.1}"
TRADEPILOT_DATA_DIR="${TRADEPILOT_DATA_DIR:-$ROOT_DIR/data}"
NODE_ENV="${NODE_ENV:-development}"

ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR" "$TRADEPILOT_DATA_DIR"
}

pid_from_file() {
  [[ -f "$PID_FILE" ]] && cat "$PID_FILE" || true
}

port_pid() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
  fi
}

is_running() {
  local pid
  pid="$(pid_from_file)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

health_check() {
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi

  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

open_student_page() {
  [[ "${AUTO_OPEN}" == "1" ]] || return 0

  local url="http://127.0.0.1:${PORT}/"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

start_app() {
  ensure_dirs

  if is_running || [[ -n "$(port_pid)" ]]; then
    echo "发现旧进程，先清理后重启..."
    stop_app || true
  fi

  echo "启动 TradePilot..."
  nohup env \
    PORT="$PORT" \
    HOST="$HOST" \
    TRADEPILOT_DATA_DIR="$TRADEPILOT_DATA_DIR" \
    NODE_ENV="$NODE_ENV" \
    "$NODE_BIN" server.js >>"$LOG_FILE" 2>&1 &

  local pid=$!
  echo "$pid" > "$PID_FILE"

  if health_check; then
    echo "启动成功，PID: $pid"
    echo "学生端: http://127.0.0.1:${PORT}/"
    echo "教师看板: http://127.0.0.1:${PORT}/dashboard"
    open_student_page
    return 0
  fi

  echo "启动后健康检查未通过，最近日志："
  tail -n 80 "$LOG_FILE" || true
  rm -f "$PID_FILE"
  exit 1
}

stop_app() {
  local pid
  pid="$(pid_from_file)"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "停止 TradePilot，PID: $pid"
    kill "$pid"
    for _ in $(seq 1 10); do
      if kill -0 "$pid" 2>/dev/null; then
        sleep 1
      else
        rm -f "$PID_FILE"
        echo "已停止。"
        return 0
      fi
    done
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "已强制停止。"
    return 0
  fi

  local occupied_pid
  occupied_pid="$(port_pid)"
  if [[ -n "$occupied_pid" ]]; then
    echo "PID 文件不存在，但端口 ${PORT} 仍被占用，尝试停止 PID: ${occupied_pid}"
    kill "$occupied_pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    return 0
  fi

  rm -f "$PID_FILE"
  echo "当前没有运行中的 TradePilot。"
}

status_app() {
  if is_running; then
    echo "TradePilot 运行中，PID: $(pid_from_file)"
    if command -v curl >/dev/null 2>&1; then
      curl -fsS "http://127.0.0.1:${PORT}/api/health" || true
      echo
    fi
    return 0
  fi

  local occupied_pid
  occupied_pid="$(port_pid)"
  if [[ -n "$occupied_pid" ]]; then
    echo "端口 ${PORT} 被其他进程占用，PID: ${occupied_pid}"
    return 1
  fi

  echo "TradePilot 未运行。"
}

logs_app() {
  ensure_dirs
  touch "$LOG_FILE"
  tail -f "$LOG_FILE"
}

case "$ACTION" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  restart)
    stop_app || true
    start_app
    ;;
  status)
    status_app
    ;;
  logs)
    logs_app
    ;;
  *)
    cat <<USAGE
Usage:
  ./start.sh start|stop|restart|status|logs

Environment:
  PORT=3000
  TRADEPILOT_DATA_DIR=./data
  NODE_BIN=node

Note:
  .env.production is ignored by default because it may contain Docker-only paths like /app/runtime-data.
USAGE
    exit 1
    ;;
esac
