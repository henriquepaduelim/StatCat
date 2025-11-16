Brand-specific assets live here.

## Structure

- `branding/clubs/<club-id>.json` – Declarative config for each club (theme colors, backend overrides, domains, env vars, asset filenames).
- `branding/assets/<club-id>/` – Static files (logos, favicons, PWA icons) referenced by the JSON config.

## Workflow

1. Duplicate an existing club JSON, update ids/domains/colors, and point the `assets` entries to filenames present under `branding/assets/<club-id>/`.
2. Drop the required SVG/PNG files into the matching assets folder.
3. Run `python scripts/build_club_package.py <club-id>` to generate a package under `packages/<club-id>/`. See `python scripts/build_club_package.py --help` for options (e.g., `--persist-theme`, `--persist-branding`, `--persist-assets` when testing locally).
4. Copy `packages/<club-id>/compose.env` to `.env` before starting Docker Compose, or deploy the bundled `frontend-dist/` to a static host.

The build script copies the assets into the Vite `public/branding/<club-id>` directory during the build, rewrites theme + branding config files, and restores the originals unless the `--persist-*` flags are supplied.***
