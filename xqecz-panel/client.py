"""
xqecz-all 部署管理 CLI 客户端
"""

import json
import sys
from pathlib import Path
from typing import Optional

import click
import httpx

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


def get_remote() -> str:
    """获取远程地址"""
    config = load_config()
    return config.get("remote", "http://127.0.0.1:9300")


def get_api_key() -> str:
    """获取 API Key"""
    config = load_config()
    return config.get("api_key", "")


def api_request(method: str, path: str, **kwargs) -> dict:
    """发送 API 请求"""
    remote = get_remote()
    api_key = get_api_key()

    headers = {"X-API-Key": api_key}
    url = f"{remote}{path}"

    try:
        with httpx.Client(timeout=600) as client:
            response = client.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()
    except httpx.ConnectError:
        click.echo(f"错误: 无法连接到 {remote}", err=True)
        sys.exit(1)
    except httpx.HTTPStatusError as e:
        click.echo(f"错误: {e.response.status_code} - {e.response.text}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)


@click.group()
@click.option("--remote", "-r", help="远程服务器地址")
@click.option("--api-key", "-k", help="API Key")
def cli(remote: Optional[str], api_key: Optional[str]):
    """xqecz-all 部署管理工具"""
    if remote:
        config = load_config()
        config["remote"] = remote
        save_config(config)

    if api_key:
        config = load_config()
        config["api_key"] = api_key
        save_config(config)


@cli.command()
def deploy():
    """一键部署"""
    click.echo("正在部署...")
    result = api_request("POST", "/api/deploy")
    click.echo(result.get("message", ""))
    if not result.get("success"):
        sys.exit(1)


@cli.command()
def build():
    """仅构建"""
    click.echo("正在构建...")
    result = api_request("POST", "/api/build")
    click.echo(result.get("message", ""))
    if not result.get("success"):
        sys.exit(1)


@cli.command()
def restart():
    """重启服务"""
    click.echo("正在重启...")
    result = api_request("POST", "/api/restart")
    click.echo(result.get("message", ""))


@cli.command()
def start():
    """启动服务"""
    click.echo("正在启动...")
    result = api_request("POST", "/api/start")
    click.echo(result.get("message", ""))


@cli.command()
def stop():
    """停止服务"""
    click.echo("正在停止...")
    result = api_request("POST", "/api/stop")
    click.echo(result.get("message", ""))


@cli.command()
def status():
    """查看状态"""
    result = api_request("GET", "/api/status")
    if result.get("success"):
        data = result.get("data", {})
        click.echo(f"运行状态: {'运行中' if data.get('running') else '已停止'}")
        click.echo(f"PID: {data.get('pid', '无')}")
        click.echo(f"项目目录: {data.get('project_dir', '')}")
    else:
        click.echo(f"错误: {result.get('message', '')}")


@cli.command()
@click.option("--lines", "-n", default=100, help="显示行数")
def logs(lines: int):
    """查看日志"""
    result = api_request("GET", f"/api/logs?lines={lines}")
    if result.get("success"):
        click.echo(result.get("data", {}).get("logs", ""))
    else:
        click.echo(f"错误: {result.get('message', '')}")


@cli.command()
@click.argument("key")
@click.argument("value")
def config_set(key: str, value: str):
    """设置配置"""
    cfg = load_config()
    cfg[key] = value
    save_config(cfg)
    click.echo(f"已设置 {key} = {value}")


@cli.command()
@click.argument("key")
def config_get(key: str):
    """获取配置"""
    cfg = load_config()
    value = cfg.get(key)
    if value is not None:
        click.echo(value)
    else:
        click.echo(f"配置 {key} 不存在")


@cli.command()
def config_show():
    """显示所有配置"""
    cfg = load_config()
    # 隐藏 API Key
    safe_cfg = {k: v for k, v in cfg.items() if k != "api_key"}
    for key, value in safe_cfg.items():
        click.echo(f"{key}: {value}")


@cli.command()
def config_init():
    """初始化配置"""
    cfg = load_config()
    if "remote" not in cfg:
        cfg["remote"] = click.prompt("远程服务器地址", default="http://127.0.0.1:9300")
    if "api_key" not in cfg:
        cfg["api_key"] = click.prompt("API Key")
    save_config(cfg)
    click.echo("配置已保存")


def main():
    """入口函数"""
    cli()


if __name__ == "__main__":
    main()
