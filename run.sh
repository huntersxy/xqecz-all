#!/bin/bash
# xqecz-all 运行脚本 (Node.js 后端)
# 用法:
#   ./run.sh          # 启动（前台）
#   ./run.sh start    # 后台启动
#   ./run.sh stop     # 停止
#   ./run.sh restart  # 重启
#   ./run.sh status   # 查看状态

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
APP_DIR="$SCRIPT_DIR/node-server"
PID_FILE="$APP_DIR/logs/server.pid"
LOG_FILE="$APP_DIR/logs/server.log"
BIN="$APP_DIR/dist/index.js"

# 前台运行
run_foreground() {
  cd "$APP_DIR"
  if [ ! -f "$BIN" ]; then
    echo "错误: $BIN 不存在，请先执行 npm run build"
    exit 1
  fi
  exec node "$BIN"
}

# 后台启动
start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "服务已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi

  cd "$APP_DIR"
  if [ ! -f "$BIN" ]; then
    echo "错误: $BIN 不存在，请先执行 npm run build"
    exit 1
  fi

  mkdir -p "$APP_DIR/logs"
  nohup node "$BIN" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1

  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✓ 服务已启动 (PID: $(cat "$PID_FILE"))"
  else
    echo "✗ 服务启动失败"
    tail -20 "$LOG_FILE"
    return 1
  fi
}

# 停止
stop() {
  if [ ! -f "$PID_FILE" ]; then
    return 0
  fi

  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    sleep 2
    kill -9 "$PID" 2>/dev/null
  fi
  rm -f "$PID_FILE"
}

# 主逻辑
case "${1}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 1; start ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "运行中 (PID: $(cat "$PID_FILE"))"
    else
      echo "未运行"
    fi
    ;;
  *)       run_foreground ;;
esac
