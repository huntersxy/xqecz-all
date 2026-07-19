#!/bin/bash
# xqecz-all 运行脚本（适用于宝塔面板启动脚本）
# 用法:
#   ./run.sh          # 启动（前台）
#   ./run.sh start    # 启动（后台 nohup）
#   ./run.sh stop     # 停止
#   ./run.sh restart  # 重启
#   ./run.sh status   # 查看状态

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

# 前台运行（宝塔启动脚本用这个）
run_foreground() {
    cd "$APP_DIR"

    if [ ! -f "./server" ]; then
        echo "错误: server 二进制不存在"
        exit 1
    fi

    if [ ! -f "config/config.yaml" ]; then
        echo "错误: config/config.yaml 不存在"
        exit 1
    fi

    exec ./server
}

# 后台启动
start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "服务已在运行 (PID: $(cat "$PID_FILE"))"
        return 0
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

    nohup ./server >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1

    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✓ 服务已启动 (PID: $(cat "$PID_FILE"))"
    else
        echo "✗ 服务启动失败"
        cat "$LOG_FILE" | tail -20
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
