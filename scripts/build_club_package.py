#!/usr/bin/env python3
"""Generate a deployment-ready package for a specific club."""

from __future__ import annotations

import argparse
import json
import os
import secrets
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
BRANDING_DIR = REPO_ROOT / "branding" / "clubs"
BRANDING_ASSETS_DIR = REPO_ROOT / "branding" / "assets"
FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
THEME_FILE = FRONTEND_DIR / "src" / "theme" / "activeTheme.generated.ts"
THEME_DARK_FILE = FRONTEND_DIR / "src" / "theme" / "activeThemeDark.generated.ts"
BRANDING_CONFIG_FILE = FRONTEND_DIR / "src" / "theme" / "branding.generated.ts"
PUBLIC_BRANDING_ROOT = FRONTEND_DIR / "public" / "branding"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "packages"
DEFAULT_LOGO = "/media/statCatLogo2.png"
DEFAULT_FAVICON = "/media/statCatLogo2-black.ico"
LOCAL_DEV_ORIGINS = ("http://localhost:3000", "http://localhost:5173")


def _dedupe_preserve(items):
    seen = set()
    result = []
    for item in items:
        if not item:
            continue
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _ensure_url_prefix(value: str) -> str:
    if not value:
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"https://{value}"


def _parse_cors_value(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if item]
    except json.JSONDecodeError:
        pass
    return [str(raw)]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a per-club package with themed frontend output and env files."
    )
    parser.add_argument(
        "club_id",
        help="Club identifier (matches branding/clubs/<club_id>.json).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory that will contain generated packages (default: %(default)s).",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip the frontend build (only env/config files will be generated).",
    )
    parser.add_argument(
        "--persist-theme",
        action="store_true",
        help="Leave the generated theme file in place (useful before rebuilding the frontend container).",
    )
    parser.add_argument(
        "--persist-branding",
        action="store_true",
        help="Leave the generated branding config file in place after the run.",
    )
    parser.add_argument(
        "--persist-assets",
        action="store_true",
        help="Do not remove the copied static assets under frontend/public/branding.",
    )
    parser.add_argument(
        "--no-localhost-cors",
        action="store_true",
        help="Do not automatically append localhost origins to BACKEND_CORS_ORIGINS.",
    )
    return parser.parse_args()


def load_branding(club_id: str) -> Dict[str, Any]:
    candidates = [
        BRANDING_DIR / f"{club_id}.json",
        BRANDING_DIR / f"{club_id.replace('-', '_')}.json",
    ]
    for path in candidates:
        if path.exists():
            with path.open(encoding="utf-8") as handle:
                data = json.load(handle)
            data.setdefault("id", club_id)
            data["_config_path"] = path
            return data
    raise FileNotFoundError(f"Branding config not found for club '{club_id}'.")


def resolve_assets_directory(club_id: str) -> Optional[Path]:
    candidates = [
        BRANDING_ASSETS_DIR / club_id,
        BRANDING_ASSETS_DIR / club_id.replace("-", "_"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def write_theme(theme: Dict[str, Any]) -> str:
    original = THEME_FILE.read_text(encoding="utf-8")
    serialized = json.dumps(theme, indent=2)
    generated = (
        'import type { ThemeDefinition } from "./themes";\n\n'
        f"export const activeTheme: ThemeDefinition = {serialized};\n\n"
        "export default activeTheme;\n"
    )
    THEME_FILE.write_text(generated, encoding="utf-8")
    return original


def write_theme_dark(theme: Dict[str, Any]) -> str:
    original = THEME_DARK_FILE.read_text(encoding="utf-8")
    serialized = json.dumps(theme, indent=2)
    generated = (
        'import type { ThemeDefinition } from "./themes";\n\n'
        f"export const activeThemeDark: ThemeDefinition = {serialized};\n\n"
        "export default activeThemeDark;\n"
    )
    THEME_DARK_FILE.write_text(generated, encoding="utf-8")
    return original


def write_branding_config(metadata: Dict[str, str]) -> str:
    original = BRANDING_CONFIG_FILE.read_text(encoding="utf-8")
    payload = {
        "id": metadata.get("id", "default"),
        "name": metadata.get("name", "StatCat Sports Analysis"),
        "assets": {
            "logo": metadata.get("logo", DEFAULT_LOGO),
            "favicon": metadata.get("favicon", DEFAULT_FAVICON),
        },
    }
    serialized = json.dumps(payload, indent=2)
    generated = (
        "export type BrandingAssets = {\n"
        "  logo: string;\n"
        "  favicon: string;\n"
        "};\n\n"
        "export type BrandingConfig = {\n"
        "  id: string;\n"
        "  name: string;\n"
        "  assets: BrandingAssets;\n"
        "};\n\n"
        f"const brandingConfig: BrandingConfig = {serialized};\n\n"
        "export default brandingConfig;\n"
    )
    BRANDING_CONFIG_FILE.write_text(generated, encoding="utf-8")
    return original


def run_frontend_build(env: Dict[str, str]) -> None:
    process_env = os.environ.copy()
    process_env.update(env)
    subprocess.run(
        ["npm", "run", "build"],
        cwd=FRONTEND_DIR,
        env=process_env,
        check=True,
    )


def copy_frontend_dist(destination: Path) -> None:
    if not FRONTEND_DIST.exists():
        raise FileNotFoundError("frontend/dist not found. Did the build complete successfully?")
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(FRONTEND_DIST, destination)


def sync_brand_assets(club_id: str, source: Path) -> Path:
    target = PUBLIC_BRANDING_ROOT / club_id
    if target.exists():
        shutil.rmtree(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target)
    return target


def build_branding_metadata(config: Dict[str, Any], assets_available: bool) -> Dict[str, str]:
    asset_base = f"/branding/{config.get('id')}" if assets_available else ""
    assets_config = config.get("assets", {})

    def resolve_asset(key: str, default: str) -> str:
        filename = assets_config.get(key)
        if filename and asset_base:
            sanitized = str(filename).lstrip("/")
            return f"{asset_base}/{sanitized}"
        return default

    return {
        "id": config.get("id", "default"),
        "name": config.get("name", "StatCat"),
        "logo": resolve_asset("logo", DEFAULT_LOGO),
        "favicon": resolve_asset("favicon", DEFAULT_FAVICON),
    }


def build_backend_env(config: Dict[str, Any], include_localhost: bool = True) -> Dict[str, str]:
    backend_config = config.get("backend", {})
    env_overrides = {k: str(v) for k, v in backend_config.get("env", {}).items()}
    cors_override = env_overrides.pop("BACKEND_CORS_ORIGINS", None)

    env = {
        "ENVIRONMENT": "production",
        "PROJECT_NAME": f"{config.get('name', 'StatCat')} API",
        "VERSION": "0.1.0",
        "DATABASE_URL": "sqlite:///./data/combine.db",
        "SECRET_KEY": secrets.token_urlsafe(48),
        "ACCESS_TOKEN_EXPIRE_MINUTES": "10080",
        "SECURITY_ALGORITHM": "HS256",
        "MEDIA_ROOT": "media",
    }
    env.update(env_overrides)

    cors_entries = []
    if cors_override:
        cors_entries.extend(_parse_cors_value(cors_override))
    elif backend_config.get("cors_origins"):
        cors_entries.extend(str(origin) for origin in backend_config["cors_origins"])
    else:
        default_app = config.get("domains", {}).get("app", "")
        if default_app:
            cors_entries.append(default_app)

    cors_entries = [_ensure_url_prefix(origin) for origin in cors_entries]
    if include_localhost:
        cors_entries.extend(LOCAL_DEV_ORIGINS)

    env["BACKEND_CORS_ORIGINS"] = json.dumps(_dedupe_preserve(cors_entries) or list(LOCAL_DEV_ORIGINS))
    return env


def build_frontend_env(config: Dict[str, Any], branding_metadata: Dict[str, str]) -> Dict[str, str]:
    env = {
        "VITE_API_BASE_URL": config.get("domains", {}).get("api", "http://localhost:8000"),
        "VITE_APP_BRAND_NAME": config.get("name", "StatCat"),
        "VITE_BRAND_ID": config.get("id", "default"),
        "VITE_BRAND_FAVICON": branding_metadata.get("favicon", DEFAULT_FAVICON),
    }
    env_overrides = config.get("frontend", {}).get("env", {})
    env.update({k: str(v) for k, v in env_overrides.items()})
    return env


def write_env_file(env: Dict[str, str], destination: Path) -> None:
    lines = [f"{key}={value}" for key, value in env.items()]
    destination.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_package_readme(package_dir: Path, config: Dict[str, Any]) -> None:
    readme = package_dir / "README.md"
    template = f"""# {config.get('name', config.get('id'))} Package

Artifacts generated on {datetime.now(timezone.utc).isoformat()} (UTC).

## Contents
- `backend.env`: Environment variables for the FastAPI container.
- `frontend.env`: Environment variables used when building the Vite frontend.
- `compose.env`: Convenience file that merges backend + frontend values (ideal to copy into `.env` before running Docker Compose).
- `frontend-dist/`: Compiled React assets (copy into nginx or object storage). Only present when the build step runs.
- `docker-compose.yml`: Base compose file referencing the env vars above.
- `branding.json`: Snapshot of the branding configuration used for this build.

## Deployment Notes
1. Copy this directory to the target server.
2. Install Docker + Docker Compose.
3. Run `cp compose.env .env` before invoking `docker compose up -d --build` if you want compose to automatically pick up both backend and frontend variables.
4. Serve `frontend-dist/` via nginx (or rebuild the Docker image pointing to these variables).
"""
    readme.write_text(template, encoding="utf-8")


def main() -> None:
    args = parse_args()
    config = load_branding(args.club_id)
    output_dir: Path = args.output_dir
    package_dir = output_dir / config["id"]
    assets_source = resolve_assets_directory(config["id"])
    assets_available = assets_source is not None
    branding_metadata = build_branding_metadata(config, assets_available)

    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir(parents=True)

    backend_env = build_backend_env(config, include_localhost=not args.no_localhost_cors)
    frontend_env = build_frontend_env(config, branding_metadata)

    write_env_file(backend_env, package_dir / "backend.env")
    write_env_file(frontend_env, package_dir / "frontend.env")
    write_env_file(
        {**backend_env, **frontend_env},
        package_dir / "compose.env",
    )

    shutil.copyfile(
        config["_config_path"],
        package_dir / "branding.json",
    )

    shutil.copyfile(
        REPO_ROOT / "docker-compose.yml",
        package_dir / "docker-compose.yml",
    )

    theme_backup: Optional[str] = None
    theme_dark_backup: Optional[str] = None
    branding_backup: Optional[str] = None
    copied_assets: Optional[Path] = None
    try:
        if not args.skip_build:
            if assets_source is not None:
                copied_assets = sync_brand_assets(config["id"], assets_source)
            theme_backup = write_theme(config["theme"])
            dark_theme = config.get("theme_dark") or config["theme"]
            theme_dark_backup = write_theme_dark(dark_theme)
            branding_backup = write_branding_config(branding_metadata)
            run_frontend_build(frontend_env)
            copy_frontend_dist(package_dir / "frontend-dist")
    finally:
        if theme_backup is not None and not args.persist_theme:
            THEME_FILE.write_text(theme_backup, encoding="utf-8")
        if theme_dark_backup is not None and not args.persist_theme:
            THEME_DARK_FILE.write_text(theme_dark_backup, encoding="utf-8")
        if branding_backup is not None and not args.persist_branding:
            BRANDING_CONFIG_FILE.write_text(branding_backup, encoding="utf-8")
        if copied_assets and not args.persist_assets and copied_assets.exists():
            shutil.rmtree(copied_assets)

    write_package_readme(package_dir, config)

    metadata = {
        "club_id": config.get("id"),
        "name": config.get("name"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "frontend_env_file": "frontend.env",
        "backend_env_file": "backend.env",
        "compose_env_file": "compose.env",
        "branding_source": str(config["_config_path"].relative_to(REPO_ROOT)),
        "skip_build": args.skip_build,
        "include_localhost_cors": not args.no_localhost_cors,
    }
    (package_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
