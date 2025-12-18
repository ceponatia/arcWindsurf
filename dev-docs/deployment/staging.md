# Staging deployment (trusted testers)

This repo uses a simple promotion model:

- `main`: ongoing development
- `staging`: what testers run

CI builds artifacts from source. Do not commit `dist/`.

## 1. Create the staging branch

```bash
git checkout -b staging
git push -u origin staging
```

## 2. Web (GitHub Pages)

Workflow: [.github/workflows/web-pages-staging.yml](../../.github/workflows/web-pages-staging.yml)

1. In GitHub: Settings -> Pages
2. Source: select "GitHub Actions"
3. Push a commit to `staging` (or run the workflow manually)

The site URL will look like:

- `https://<owner>.github.io/<repo>/`

Notes:

- The workflow sets `BASE_PATH=/<repo>/` so Vite assets work on Pages.

## 3. API image (GHCR)

Workflow: [.github/workflows/api-ghcr-staging.yml](../../.github/workflows/api-ghcr-staging.yml)

- On push to `staging`, CI builds and pushes:
  - `ghcr.io/<owner>/<repo>/api:staging`
  - `ghcr.io/<owner>/<repo>/api:<sha>`

This does not deploy anywhere by itself.

## 4. API deploy (Fly.io)

Workflow: [.github/workflows/api-fly-deploy-staging.yml](../../.github/workflows/api-fly-deploy-staging.yml)

This workflow is manual and is skipped until you add these GitHub repo secrets:

- `FLY_API_TOKEN`
- `FLY_APP_NAME`

Once Fly is set up:

1. Create the Fly app (one-time):

```bash
flyctl apps create <your-app-name>
```

2. Set any required secrets (examples):

```bash
flyctl secrets set \
  DATABASE_URL="..." \
  AUTH_SECRET="..." \
  OPENROUTER_API_KEY="..." \
  OPENROUTER_MODEL="deepseek/deepseek-chat"
```

3. Run the workflow "API - Deploy to Fly.io (staging)" and keep the default image tag `staging`.

## 5. Promotion flow

- Develop on `main` (feature branches -> PRs into `main`).
- When ready for testers: open a PR from `main` -> `staging` and merge.
- CI deploys web and updates the API image tag.
