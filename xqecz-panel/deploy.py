"""
xqecz-all 部署管理模块
"""

import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Optional


class DeployManager:
    """部署管理器"""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.dist_dir = self.project_dir / "dist"
        self.pid_file = self.dist_dir / "logs" / "server.pid"
        self.log_file = self.dist_dir / "logs" / "server.log"

    def _run(self, cmd: str, cwd: Optional[Path] = None) -> subprocess.CompletedProcess:
        """执行 shell 命令"""
        if cwd is None:
            cwd = self.project_dir
        result = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=600
        )
        return result

    def _run_with_output(self, cmd: str, cwd: Optional[Path] = None) -> tuple[bool, str]:
        """执行命令并返回详细输出"""
        if cwd is None:
            cwd = self.project_dir
        try:
            result = subprocess.run(
                cmd, shell=True, cwd=cwd,
                capture_output=True, text=True, timeout=600
            )
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += result.stderr
            return result.returncode == 0, output.strip()
        except subprocess.TimeoutExpired:
            return False, "命令执行超时"
        except Exception as e:
            return False, str(e)

    def _load_env(self) -> dict:
        """加载环境变量"""
        env = os.environ.copy()
        env.update({
            "HOME": env.get("HOME", "/root"),
            "GOPATH": env.get("HOME", "/root") + "/go",
            "GOCACHE": env.get("HOME", "/root") + "/.cache/go-build",
        })
        return env

    def get_pid(self) -> Optional[int]:
        """获取服务 PID"""
        if not self.pid_file.exists():
            return None
        try:
            pid = int(self.pid_file.read_text().strip())
            # 检查进程是否存在
            os.kill(pid, 0)
            return pid
        except (ValueError, ProcessLookupError, PermissionError):
            return None

    def is_running(self) -> bool:
        """检查服务是否运行中"""
        return self.get_pid() is not None

    def get_status(self) -> dict:
        """获取服务状态"""
        pid = self.get_pid()
        return {
            "running": pid is not None,
            "pid": pid,
            "project_dir": str(self.project_dir),
            "log_file": str(self.log_file),
        }

    def get_logs(self, lines: int = 100) -> str:
        """获取日志"""
        if not self.log_file.exists():
            return "日志文件不存在"
        try:
            result = self._run(f"tail -n {lines} {self.log_file}")
            return result.stdout
        except Exception as e:
            return f"读取日志失败: {e}"

    def git_pull(self) -> tuple[bool, str]:
        """拉取代码"""
        self._run("git config pull.rebase false")
        success, output = self._run_with_output("git pull")
        if not success:
            return False, f"git pull 失败:\n{output}"
        return True, f"git pull 成功:\n{output}"

    def build_frontend(self) -> tuple[bool, str]:
        """构建前端"""
        frontend_dir = self.project_dir / "frontend"

        # 检查是否需要安装依赖
        if not (frontend_dir / "node_modules").exists():
            success, output = self._run_with_output("npm install", cwd=frontend_dir)
            if not success:
                return False, f"npm install 失败:\n{output}"

        success, output = self._run_with_output("npm run build", cwd=frontend_dir)
        if not success:
            return False, f"前端构建失败:\n{output}"
        return True, f"前端构建完成:\n{output}"

    def build_backend(self) -> tuple[bool, str]:
        """构建后端 (Node.js)"""
        backend_dir = self.project_dir / "node-server"
        if not (backend_dir / "node_modules").exists():
            success, output = self._run_with_output("npm install", cwd=backend_dir)
            if not success:
                return False, f"npm install 失败:\n{output}"
        success, output = self._run_with_output("npm run build", cwd=backend_dir)
        if not success:
            return False, f"后端构建失败:\n{output}"
        return True, "后端构建完成"

    def copy_frontend(self) -> tuple[bool, str]:
        """复制前端产物"""
        dist_frontend = self.dist_dir / "frontend"
        dist_frontend.mkdir(parents=True, exist_ok=True)

        # 删除旧产物
        old_dist = dist_frontend / "dist"
        if old_dist.exists():
            self._run(f"rm -rf {old_dist}")

        # 复制新产物
        src_dist = self.project_dir / "frontend" / "dist"
        if not src_dist.exists():
            return False, "前端产物不存在"

        self._run(f"cp -r {src_dist} {dist_frontend}/")
        return True, "前端产物已复制"

    def start_service(self) -> tuple[bool, str]:
        """启动服务 (Node.js)"""
        if self.is_running():
            return True, "服务已在运行中"

        # 确保日志目录存在
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

        server_bin = self.project_dir / "node-server" / "dist" / "index.js"
        if not server_bin.exists():
            return False, "服务产物不存在 (node-server/dist/index.js)，请先构建"

        # 启动服务
        with open(self.log_file, "a") as log_f:
            process = subprocess.Popen(
                ["node", str(server_bin)],
                cwd=str(self.project_dir),
                stdout=log_f,
                stderr=log_f,
                start_new_session=True
            )

        # 写入 PID
        self.pid_file.write_text(str(process.pid))

        # 等待启动
        time.sleep(1)
        if self.is_running():
            return True, f"服务已启动 (PID: {process.pid})"
        else:
            return False, "服务启动失败"

    def stop_service(self) -> tuple[bool, str]:
        """停止服务"""
        pid = self.get_pid()
        if pid is None:
            return True, "服务未运行"

        try:
            os.kill(pid, signal.SIGTERM)
            time.sleep(2)

            # 强制杀死
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

            # 清理 PID 文件
            if self.pid_file.exists():
                self.pid_file.unlink()

            return True, f"服务已停止 (PID: {pid})"
        except Exception as e:
            return False, f"停止服务失败: {e}"

    def restart_service(self) -> tuple[bool, str]:
        """重启服务（先停止再启动）"""
        self.stop_service()
        return self.start_service()

    def deploy(self) -> tuple[bool, str]:
        """一键部署"""
        results = []

        # 1. 拉取代码
        success, msg = self.git_pull()
        results.append(f"1. {msg}")
        if not success:
            return False, "\n".join(results)

        # 2. 构建前端
        success, msg = self.build_frontend()
        results.append(f"2. {msg}")
        if not success:
            return False, "\n".join(results)

        # 3. 构建后端
        success, msg = self.build_backend()
        results.append(f"3. {msg}")
        if not success:
            return False, "\n".join(results)

        # 4. 复制前端产物
        success, msg = self.copy_frontend()
        results.append(f"4. {msg}")
        if not success:
            return False, "\n".join(results)

        # 5. 重启服务
        success, msg = self.restart_service()
        results.append(f"5. {msg}")

        return success, "\n".join(results)

    def build(self) -> tuple[bool, str]:
        """仅构建"""
        results = []

        # 1. 构建前端
        success, msg = self.build_frontend()
        results.append(f"1. {msg}")
        if not success:
            return False, "\n".join(results)

        # 2. 构建后端
        success, msg = self.build_backend()
        results.append(f"2. {msg}")
        if not success:
            return False, "\n".join(results)

        # 3. 复制前端产物
        success, msg = self.copy_frontend()
        results.append(f"3. {msg}")

        return success, "\n".join(results)
