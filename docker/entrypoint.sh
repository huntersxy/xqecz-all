#!/bin/bash
set -e

# 捕获信号
trap 'echo "Received signal, shutting down..."; kill $BACKEND_PID; wait $BACKEND_PID; exit 0' SIGTERM SIGINT

# 启动后端
echo "Starting backend server..."
/app/server &
BACKEND_PID=$!

# 等待后端启动
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if curl -s -f http://127.0.0.1:8080/api/auth/login > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Backend failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# 启动Nginx
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# 等待任意子进程退出
wait -n

# 清理
echo "Shutting down..."
kill $BACKEND_PID $NGINX_PID 2>/dev/null
wait $BACKEND_PID $NGINX_PID 2>/dev/null
exit 0
