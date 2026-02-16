# Deployment Guide (GitHub Repo)

You cannot deploy a full Laravel + Next.js app "on GitHub" itself.  
GitHub stores code; a hosting platform runs it.

This repo is a monorepo with:
- `backend` (Laravel 12 API)
- `frontend` (Next.js 14 app)

Recommended setup:
- Backend: Render (or Railway) web service
- Frontend: Vercel project
- Database: Managed MySQL/PostgreSQL (from your host or external provider)

## 1. Push Your Latest Code

From local machine:

```bash
git add .
git commit -m "prepare deployment config"
git push origin main
```

## 2. Deploy Backend (`backend`)

Create a web service from this GitHub repo and set root directory to `backend`.

Build command:

```bash
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Start command:

```bash
php artisan migrate --force
php artisan serve --host=0.0.0.0 --port=$PORT
```

Set backend environment variables:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR-BACKEND-DOMAIN

DB_CONNECTION=mysql
DB_HOST=YOUR_DB_HOST
DB_PORT=3306
DB_DATABASE=YOUR_DB_NAME
DB_USERNAME=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD

SANCTUM_STATEFUL_DOMAINS=YOUR-FRONTEND-DOMAIN
CORS_ALLOWED_ORIGINS=https://YOUR-FRONTEND-DOMAIN
CORS_SUPPORTS_CREDENTIALS=false
```

Important:
- Run `php artisan key:generate --force` once if `APP_KEY` is missing.
- Run `php artisan db:seed --force` once after first successful migration.
- Seeders create default users with password `password123`. Change these passwords after first login.

## 3. Deploy Frontend (`frontend`)

Create a Vercel project from the same GitHub repo and set root directory to `frontend`.

Set frontend environment variable:

```env
BACKEND_API_URL=https://YOUR-BACKEND-DOMAIN
```

Build/Start (Vercel defaults are fine):
- Build: `npm run build`
- Start: `npm run start`

## 4. Verify

1. Open frontend URL and login.
2. Confirm API health through frontend proxy:
   - `https://YOUR-FRONTEND-DOMAIN/api/health`
3. Confirm backend direct health:
   - `https://YOUR-BACKEND-DOMAIN/api/health`

If frontend API calls fail:
- Check `BACKEND_API_URL` in frontend environment.
- Check `CORS_ALLOWED_ORIGINS` in backend environment.
- Confirm backend is reachable publicly via HTTPS.
