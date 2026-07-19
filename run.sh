#!/bin/bash
# xqecz-all 运行脚本
# 用法: ./run.sh [start|stop|restart|status|logs]

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
APP_DIR="$SCRIPT_DIR/dist"
PID_FILE="$APP_DIR/logs/server.pid"
LOG_FILE="$APP_DIR/logs/server.log"

# 加载环境变量
source /etc/profile 2>/dev/null || true
source ~/.bashrc 2>/dev/null || true
export HOME=${HOME:-/root}
export GOPATH=$HOME/go
export GOCACHE=$HOME/.cache/go-build

# 启动服务
start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "服务已在运行 (PID: $(cat "$PID_FILE"))"
        return 1
    fi

    cd "$APP_DIR"

    if [ ! -f "./server" ]; then
        echo "错误: server 二进制不存在"
        exit 1
    fi

    if [ ! -f "config/config.yaml" ]; then
        echo "错误: config/config.yaml 不存在"
        exit 1
    fi

    echo "启动服务..."
    nohup ./server >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    sleep 1

    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✓ 服务已启动 (PID: $(cat "$PID_FILE"))"
        echo "日志: tail -f $LOG_FILE"
    else
        echo "✗ 服务启动失败，查看日志: $LOG_FILE"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

# 停止服务
stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "服务未运行"
        return 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "停止服务 (PID: $PID)..."
        kill "$PID"
        sleep 2
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID"
        fi
        rm -f "$PID_FILE"
        echo "✓ 服务已停止"
    else
        echo "服务未运行"
        rm -f "$PID_FILE"
    fi
}

# 重启服务
restart() {
    stop
    sleep 1
    start
}

# 查看状态
status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "服务运行中 (PID: $(cat "$PID_FILE"))"
    else
        echo "服务未运行"
    fi
}

# 查看日志
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "日志文件不存在"
    fi
}

# 主逻辑
case "${1:-start}" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    logs)    logs ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
