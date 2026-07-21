"""
xqecz-all 部署管理 HTTP API 服务器
"""

import json
import secrets
import subprocess
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn

from deploy import DeployManager

# 配置文件路径
CONFIG_FILE = Path(__file__).parent / "config.json"


def load_config() -> dict:
    """加载配置"""
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return {}


def save_config(config: dict):
    """保存配置"""
    CONFIG_FILE.write_text(json.dumps(config, indent=2, ensure_ascii=False))


def get_api_key() -> str:
    """获取或生成 API Key"""
    config = load_config()
    if "api_key" not in config:
        config["api_key"] = secrets.token_urlsafe(32)
        save_config(config)
    return config["api_key"]


def find_project_root() -> Path:
    """向上查找仓库根目录（以 Dockerfile 为标记，与脚本实际位置无关）"""
    d = Path(__file__).resolve().parent
    for parent in [d, *d.parents]:
        if (parent / "Dockerfile").exists():
            return parent
    return d.parent


def get_project_dir() -> str:
    """获取项目目录"""
    config = load_config()
    return config.get("project_dir", str(find_project_root()))


# 初始化
app = FastAPI(title="xqecz-all 部署管理 API", version="1.0.0")
deploy_manager = DeployManager(get_project_dir())


class Response(BaseModel):
    """统一响应"""
    success: bool
    message: str
    data: Optional[dict] = None


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """验证 API Key"""
    expected_key = get_api_key()
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="无效的 API Key")


def stream_output(cmd: str, cwd: Optional[str] = None):
    """流式输出命令执行结果"""
    try:
        process = subprocess.Popen(
            cmd, shell=True, cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in iter(process.stdout.readline, ''):
            yield line

        process.wait()
        yield f"\n[EXIT] Process exited with code {process.returncode}\n"
    except Exception as e:
        yield f"\n[ERROR] {str(e)}\n"


@app.get("/")
async def root():
    """API 信息"""
    return {
        "name": "xqecz-all 部署管理 API",
        "version": "1.0.0",
        "endpoints": [
            {"method": "POST", "path": "/api/deploy", "desc": "一键部署"},
            {"method": "POST", "path": "/api/build", "desc": "仅构建"},
            {"method": "POST", "path": "/api/restart", "desc": "重启服务"},
            {"method": "POST", "path": "/api/start", "desc": "启动服务"},
            {"method": "POST", "path": "/api/stop", "desc": "停止服务"},
            {"method": "GET", "path": "/api/status", "desc": "服务状态"},
            {"method": "GET", "path": "/api/logs", "desc": "查看日志"},
            {"method": "GET", "path": "/api/config", "desc": "查看配置"},
        ]
    }


@app.post("/api/deploy")
async def deploy(x_api_key: Optional[str] = Header(None)):
    """一键部署（流式输出）"""
    verify_api_key(x_api_key)

    def run_deploy():
        project_dir = get_project_dir()
        yield "[STEP 1] Pulling latest code...\n"
        yield from stream_output("git config pull.rebase false && git pull", cwd=project_dir)

        yield "\n[STEP 2] Building frontend...\n"
        yield from stream_output("cd frontend && npm run build", cwd=project_dir)

        yield "\n[STEP 3] Building backend...\n"
        yield from stream_output("cd server && npm ci && npm run build", cwd=project_dir)

        yield "\n[STEP 4] Preparing runtime dirs...\n"
        yield from stream_output("mkdir -p dist/logs server/uploads/thumbs server/data", cwd=project_dir)

        yield "\n[STEP 5] Restarting service...\n"
        pid_file = Path(project_dir) / "dist" / "logs" / "server.pid"
        if pid_file.exists():
            pid = pid_file.read_text().strip()
            yield f"Sending SIGTERM to PID {pid}...\n"
            yield from stream_output(f"kill -TERM {pid} 2>/dev/null || true", cwd=project_dir)
            time.sleep(2)
        else:
            yield "Starting new service...\n"
        yield from stream_output("nohup node server/dist/index.js >> dist/logs/server.log 2>&1 & echo $! > dist/logs/server.pid", cwd=project_dir)

        yield "\n[DONE] Deploy completed!\n"

    return StreamingResponse(run_deploy(), media_type="text/plain")


@app.post("/api/build")
async def build(x_api_key: Optional[str] = Header(None)):
    """仅构建（流式输出）"""
    verify_api_key(x_api_key)

    def run_build():
        project_dir = get_project_dir()

        yield "[STEP 1] Building frontend...\n"
        yield from stream_output("cd frontend && npm run build", cwd=project_dir)

        yield "\n[STEP 2] Building backend...\n"
        yield from stream_output("cd server && npm ci && npm run build", cwd=project_dir)

        yield "\n[STEP 3] Preparing runtime dirs...\n"
        yield from stream_output("mkdir -p dist/logs server/uploads/thumbs server/data", cwd=project_dir)

        yield "\n[DONE] Build completed!\n"

    return StreamingResponse(run_build(), media_type="text/plain")


@app.post("/api/restart")
async def restart(x_api_key: Optional[str] = Header(None)):
    """重启服务"""
    verify_api_key(x_api_key)
    success, message = deploy_manager.restart_service()
    return Response(success=success, message=message)


@app.post("/api/start")
async def start(x_api_key: Optional[str] = Header(None)):
    """启动服务"""
    verify_api_key(x_api_key)
    success, message = deploy_manager.start_service()
    return Response(success=success, message=message)


@app.post("/api/stop")
async def stop(x_api_key: Optional[str] = Header(None)):
    """停止服务"""
    verify_api_key(x_api_key)
    success, message = deploy_manager.stop_service()
    return Response(success=success, message=message)


@app.get("/api/status")
async def status(x_api_key: Optional[str] = Header(None)):
    """服务状态"""
    verify_api_key(x_api_key)
    data = deploy_manager.get_status()
    return Response(success=True, message="获取状态成功", data=data)


@app.get("/api/logs")
async def logs(lines: int = 100, x_api_key: Optional[str] = Header(None)):
    """查看日志"""
    verify_api_key(x_api_key)
    content = deploy_manager.get_logs(lines)
    return Response(success=True, message="获取日志成功", data={"logs": content})


@app.get("/api/config")
async def get_config(x_api_key: Optional[str] = Header(None)):
    """查看配置"""
    verify_api_key(x_api_key)
    config = load_config()
    # 隐藏 API Key
    safe_config = {k: v for k, v in config.items() if k != "api_key"}
    return Response(success=True, message="获取配置成功", data=safe_config)


@app.post("/api/config")
async def update_config(data: dict, x_api_key: Optional[str] = Header(None)):
    """更新配置"""
    verify_api_key(x_api_key)
    config = load_config()
    config.update(data)
    save_config(config)

    # 更新 deploy_manager
    global deploy_manager
    deploy_manager = DeployManager(config.get("project_dir", str(find_project_root())))

    return Response(success=True, message="配置已更新")


def main():
    """启动服务器"""
    config = load_config()
    port = config.get("port", 9300)
    api_key = get_api_key()

    print(f"=== xqecz-all 部署管理 API ===")
    print(f"监听端口: {port}")
    print(f"API Key: {api_key}")
    print(f"项目目录: {get_project_dir()}")
    print()

    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
