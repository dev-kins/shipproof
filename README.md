# ShipProof

ShipProof turns a public GitHub repository into a clear, shareable project story. It pairs repository facts with the context only the developer can provide, then offers an editorial preview and a portable Markdown download.

[Open the live demo](https://ship-proof.onrender.com/) · [View the source on GitHub](https://github.com/dev-kins/shipproof)

## The problem

GitHub shows code, languages, and activity, but it does not explain the problem a project solves or what its developer contributed. ShipProof helps developers, students, and job seekers present that context without treating commit history as proof of individual authorship.

## How it works

1. Enter a public repository URL from `github.com`.
2. ShipProof retrieves repository details, languages, and recent activity from GitHub.
3. Write the project summary, problem, contribution, features, challenges, and lessons in your own words.
4. Preview the case study and download it as Markdown.

## Features

- Validates and normalizes repository URLs on the server; only direct HTTPS `github.com/{owner}/{repo}` URLs are accepted.
- Shows repository metadata, detected languages, and up to eight recent commits with links to GitHub.
- Keeps GitHub-sourced facts visually separate from developer-authored content.
- Validates story fields and optional HTTP(S) project links in the browser.
- Exports a formatted Markdown file, escaping user content and including source links and repository facts.
- Handles unavailable repositories, GitHub rate limits and API errors, malformed responses, and network timeouts with user-facing messages.
- Supports an optional server-side GitHub token to improve API rate limits. Public lookups still work when no token is configured.

## Technology

- **Backend:** PHP 8.2+, Laravel 12, SQLite
- **Frontend:** React 19, Inertia 3, JavaScript/JSX, Tailwind CSS 4, Vite 7
- **External data:** GitHub REST API
- **Deployment:** Docker on Render

## Architecture and engineering decisions

- The browser submits the repository URL to Laravel. `GitHubRepositoryUrl` rejects unsupported hosts and malformed paths before the `GitHubRepositoryService` calls GitHub.
- The service fetches repository metadata, languages, and a limited commit list with Laravel's HTTP client, then returns a stable, normalized structure. API credentials stay in server configuration and are sent only as a Bearer header from Laravel; they are never included in page props or API responses.
- `GITHUB_TOKEN` is optional. Leave it empty for unauthenticated public requests, or configure a token in the server environment to raise the available GitHub API rate limit. Never place a token in frontend variables or commit it.
- Errors are translated into safe messages, and requests use finite connection and response timeouts. Rate-limited requests are not automatically retried.
- Laravel trusts only `X-Forwarded-Proto` from the configured proxy boundary, allowing HTTPS URL generation behind Render's TLS-terminating proxy without hardcoding the production hostname.
- Story fields live in React page state. Repository data is carried to the overview through Laravel's session flash data. There is no account system or database-backed showcase.

## Run locally

Requirements: PHP 8.2 or newer with Laravel's required extensions, Composer 2, Node.js 20.19+ or 22.12+, and npm.

From the project directory, install dependencies and prepare SQLite. After copying `.env.example`, change `SESSION_DRIVER=database` to `SESSION_DRIVER=file` in `.env`; this project does not include a sessions-table migration.

```powershell
composer install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
if (!(Test-Path database/database.sqlite)) { New-Item -ItemType File database/database.sqlite | Out-Null }
php artisan migrate
npm ci
```

In separate terminals, start the Laravel and Vite development servers:

```powershell
php artisan serve
```

```powershell
npm run dev
```

Open the URL printed by `php artisan serve` (usually `http://127.0.0.1:8000`).

## Environment variables

Start with `.env.example`. Local development uses SQLite, database-backed cache and queue drivers, and file-backed sessions. The included migrations create the cache and jobs tables. The local SQLite file is ignored by Git.

| Variable | Purpose |
| --- | --- |
| `APP_KEY` | Laravel encryption key. Generate locally with `php artisan key:generate`; keep it private. |
| `APP_ENV`, `APP_DEBUG` | Use `local` and `true` for development; use `production` and `false` in production. |
| `APP_URL` | Application base URL; set to the HTTPS service URL in production. |
| `DB_CONNECTION`, `DB_DATABASE` | SQLite connection and database path. Locally, the default path is `database/database.sqlite`. |
| `SESSION_DRIVER` | Use `file` locally and in the current Render setup; no sessions table migration is included. |
| `CACHE_STORE`, `QUEUE_CONNECTION` | Locally, both default to `database` and use the included cache/jobs migrations. The Render setup uses `file` and `sync`. |
| `GITHUB_TOKEN` | Optional. Empty by default; configure only as a server-side secret. Never commit a real token or `.env` file. |

## Tests and checks

```powershell
npm run build
npm test
php artisan test
vendor\bin\pint --test
composer validate --no-check-publish
```

The PHP tests cover repository URL normalization and rejection cases, normalized GitHub metadata and activity, optional Bearer authentication, missing/private repositories, 403/429 rate limits, API failures and timeouts, lookup behavior, and HTTPS URL generation from a forwarded HTTPS request. GitHub API calls are mocked in tests.

The JavaScript tests cover story and URL validation, Markdown output and escaping, omission of empty sections, and portable download filenames.

## Live deployment

The live demo runs as a Docker web service on Render. Its container builds frontend assets, installs production Composer dependencies, creates the SQLite database, runs migrations, and listens on Render's assigned port. Configure `APP_ENV=production`, `APP_DEBUG=false`, an `APP_KEY` secret, HTTPS `APP_URL` and `ASSET_URL`, `DB_CONNECTION=sqlite`, `DB_DATABASE=/tmp/shipproof.sqlite`, `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync`, and `LOG_CHANNEL=stderr`. `GITHUB_TOKEN` is optional. Use `/up` for the health check.

Render's free web service may sleep after inactivity, and its filesystem is ephemeral. The demo is suitable for evaluation, not durable storage: its temporary SQLite database and page/session state can be lost on restart or redeploy.

## Current limitations and roadmap

- Draft content is held in page memory; the repository result is passed to the overview through session flash data. Refreshing loses the story and overview.
- Public case-study URLs and publishing are not implemented. Markdown download is the current sharing option.
- There is no authentication or persistent project storage.

Possible next steps are public case-study publishing and persistent storage for saved drafts. Those features will require an explicit privacy and data-retention design before implementation.
