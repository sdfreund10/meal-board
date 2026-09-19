# Production deploy (API)

This guide covers the **API droplet** only: nginx terminates TLS and reverse-proxies to uvicorn. Layout matches [`systemd/mealboard-api.service`](systemd/mealboard-api.service):

```text
/opt/mealboard/
  backend/          # FastAPI app, .venv, .env, alembic
```

The React SPA is hosted separately (CDN + load balancer) and has its own deploy path. Put its public HTTPS origin in `CORS_ORIGINS` (e.g. `https://meals.sfreund.tools`). Do not serve the SPA or run certbot for it on this box.

| Role | Host | Where |
| --- | --- | --- |
| API | `api.meals.sfreund.tools` | this droplet (nginx → uvicorn) |
| SPA | `meals.sfreund.tools` | CDN + load balancer (separate deploy) |

## Prerequisites

On the droplet:

- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- PostgreSQL (localhost only)
- nginx (+ certbot for the API hostname)

## 1. System user and app directory

```bash
sudo adduser --system --group --home /opt/mealboard mealboard
sudo mkdir -p /opt/mealboard
sudo chown mealboard:mealboard /opt/mealboard
```

Clone the repo as that user (or clone then `chown`):

```bash
sudo -u mealboard -H git clone git@github.com:OWNER/mealboard.git /opt/mealboard
# optional: drop non-runtime trees if you want a leaner tree
# rm -rf /opt/mealboard/frontend /opt/mealboard/backend/tests /opt/mealboard/backend/evals
```

## 2. Backend install

```bash
cd /opt/mealboard/backend
sudo -u mealboard -H uv sync --no-dev
```

Create Postgres to match `DATABASE_URL` (keep Postgres on localhost):

```sql
CREATE USER mealboard WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE mealboard OWNER mealboard;
```

## 3. Environment (`.env`)

Production settings are validated when `APP_ENV=production` (see `backend/app/config.py`). Copy the example and fill in values:

```bash
cd /opt/mealboard/backend
sudo -u mealboard -H cp .env.example .env
sudo chmod 600 .env
sudo chown mealboard:mealboard .env
```

| Key | Required | Notes |
| --- | --- | --- |
| `APP_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Must not use default `mealboard:mealboard` credentials |
| `CORS_ORIGINS` | yes | JSON list of SPA HTTPS origins, e.g. `["https://meals.sfreund.tools"]` |
| `HOUSEHOLD_PIN` | yes | Strong, non-default (not `1234`) |
| `ADMIN_PASSWORD` | yes | Strong, non-default, ≥10 characters |
| `SESSION_SECRET` | yes | ≥32 random characters |
| `SESSION_HTTPS_ONLY` | yes | `true` |
| `OPENROUTER_API_KEY` | yes | Required outside test |

Generate a session secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Example production `.env`:

```bash
APP_ENV=production
DATABASE_URL=postgresql://mealboard:STRONG_PASSWORD@127.0.0.1:5432/mealboard
CORS_ORIGINS=["https://meals.sfreund.tools"]
HOUSEHOLD_PIN=your-strong-pin
ADMIN_PASSWORD=your-strong-admin-password
SESSION_SECRET=paste-generated-secret-here
SESSION_HTTPS_ONLY=true
OPENROUTER_API_KEY=sk-or-...
```

## 4. Migrate

```bash
cd /opt/mealboard/backend
sudo -u mealboard -H uv run alembic upgrade head
```

Smoke-check imports and settings (fails fast on weak production config):

```bash
cd /opt/mealboard/backend
sudo -u mealboard -H uv run python -c "from app.config import settings; print(settings.app_env)"
```

## 5. systemd (uvicorn)

Install the unit from this repo:

```bash
sudo cp /opt/mealboard/deploy/systemd/mealboard-api.service /etc/systemd/system/mealboard-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now mealboard-api
sudo systemctl status mealboard-api
```

The unit runs:

- User/Group: `mealboard`
- WorkingDirectory: `/opt/mealboard/backend`
- Env file: `/opt/mealboard/backend/.env`
- Bind: `127.0.0.1:8001` with `--proxy-headers`

Useful commands:

```bash
sudo systemctl restart mealboard-api
sudo journalctl -u mealboard-api -f
curl -sS http://127.0.0.1:8001/health
curl -sS http://127.0.0.1:8001/db-health
```

## 6. nginx (API only)

Production sessions require HTTPS (`SESSION_HTTPS_ONLY=true`). uvicorn trusts `X-Forwarded-*` from `127.0.0.1` only. Trusted hosts in the app are currently hardcoded to `api.meals.sfreund.tools`.

Create the site under `/etc/nginx/sites-available/` and enable it:

```bash
sudo nano /etc/nginx/sites-available/api.meals.sfreund.tools
sudo ln -sf /etc/nginx/sites-available/api.meals.sfreund.tools /etc/nginx/sites-enabled/
```

Paste this HTTP block (certbot will add TLS afterward):

```nginx
server {
    listen 80;
    server_name api.meals.sfreund.tools;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable TLS:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.meals.sfreund.tools
```

Certbot rewrites the vhost for TLS and adds an HTTP→HTTPS redirect. Renewals are handled by the certbot timer (`sudo certbot renew --dry-run` to verify).

Firewall: allow 80/443 publicly; keep Postgres and uvicorn on localhost.

## 7. Verify

```bash
curl -sS https://api.meals.sfreund.tools/health
# {"status":"ok"}

curl -sS https://api.meals.sfreund.tools/db-health
# {"status":"ok"}
```

## Deploy user (limited sudo)

Separate SSH user for API deploys (and later GitHub Actions). Passwordless sudo is limited to restarting/statusing the API unit.

```bash
# As an admin on the droplet:
sudo adduser --disabled-password --gecos "" mealboard-deploy

# On your laptop: generate the CI → droplet key
ssh-keygen -t ed25519 -C "mealboard-github-actions" -f mealboard-deploy-key -N ""

# On the droplet: install the public key
sudo mkdir -p /home/mealboard-deploy/.ssh
sudo chmod 700 /home/mealboard-deploy/.ssh
sudo nano /home/mealboard-deploy/.ssh/authorized_keys   # paste mealboard-deploy-key.pub
sudo chmod 600 /home/mealboard-deploy/.ssh/authorized_keys
sudo chown -R mealboard-deploy:mealboard-deploy /home/mealboard-deploy/.ssh

# Deploy user owns the app tree
sudo chown -R mealboard-deploy:mealboard-deploy /opt/mealboard
sudo chmod 600 /opt/mealboard/backend/.env

# Passwordless sudo for restart/status only
sudo visudo -f /etc/sudoers.d/deploy-mealboard
# add this exact line:
# mealboard-deploy ALL=(root) NOPASSWD: /bin/systemctl restart mealboard-api, /bin/systemctl status mealboard-api
sudo chmod 440 /etc/sudoers.d/deploy-mealboard
```

The systemd unit runs as `User=mealboard`. Either keep that user and make the tree group-readable by `mealboard`, or point the unit at `mealboard-deploy` instead. Simplest if you already created `mealboard` for the service:

```bash
sudo usermod -aG mealboard-deploy mealboard
sudo chmod -R g+rX /opt/mealboard
sudo chmod 640 /opt/mealboard/backend/.env
```

Test from your laptop:

```bash
ssh -i mealboard-deploy-key mealboard-deploy@YOUR_DROPLET_IP
sudo systemctl restart mealboard-api
sudo systemctl status mealboard-api
```

Droplet → GitHub is a **second** key pair (do not reuse the CI → droplet key). As `mealboard-deploy`:

```bash
ssh-keygen -t ed25519 -C "mealboard-droplet-git" -f ~/.ssh/id_ed25519 -N ""
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
cat ~/.ssh/id_ed25519.pub
# GitHub → repo Settings → Deploy keys → Add (read-only)
cd /opt/mealboard && git remote -v   # prefer git@github.com:OWNER/mealboard.git
```

## Continuous deploy (GitHub Actions)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs backend pytest, then SSHs in as `mealboard-deploy` and runs:

```bash
git pull --ff-only
cd backend
uv sync --no-dev
uv run alembic upgrade head
sudo systemctl restart mealboard-api
```

Triggers: push to `main` touching `backend/**`, `deploy/**`, or the workflow file; or manual **workflow_dispatch**.

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Droplet IP or hostname |
| `DEPLOY_USER` | `mealboard-deploy` |
| `DEPLOY_SSH_KEY` | Full private key from `mealboard-deploy-key` (including `BEGIN`/`END` lines) |
| `DEPLOY_PATH` | Absolute app path on the droplet (`/opt/mealboard`) |
| `HEALTH_CHECK_HOST` | Public API hostname only (`api.meals.sfreund.tools`) |

After restart, Actions curls `https://<HEALTH_CHECK_HOST>/health` (with retries). Production `.env` stays on the droplet.

## Manual update (API)

As `mealboard-deploy` (same steps as CI):

```bash
cd /opt/mealboard
git pull --ff-only

cd /opt/mealboard/backend
uv sync --no-dev
uv run alembic upgrade head

sudo systemctl restart mealboard-api
```

SPA builds and CDN publishes are out of scope here.

## Observability

### Health checks

| Path | Meaning |
| --- | --- |
| `GET /health` | Process up → `{"status":"ok"}` |
| `GET /db-health` | Postgres reachable → `{"status":"ok"}`, else `503` |

Point an external uptime check at `https://api.meals.sfreund.tools/db-health` (or `/health` if you only care that uvicorn is up). Interval 1–5 minutes; alert on consecutive failures.

### Logs

```bash
sudo journalctl -u mealboard-api -e
```
