# Supabase setup (staging)

This repo uses Postgres + pgvector.

## 1. Create a Supabase project

- Supabase -> New project
- Save the DB password
- Pick a region close to your testers

## 2. Enable extensions

Enable these extensions:

- `vector` (pgvector)
- `pgcrypto` (for `gen_random_uuid()`)

You can do this either via the Supabase dashboard (Database -> Extensions), or in the SQL editor:

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;
```

## 3. Apply the schema

Option A (recommended): run the repo migrations from your machine:

```bash
export DATABASE_URL='postgres://...sslmode=require'

pnpm -w install
pnpm -F @minimal-rpg/db db:migrate
```

If you get an IPv6 connectivity error like `ENETUNREACH ... 2600:...:5432` on Linux, your network likely doesn't have IPv6 routing. Force Node to prefer IPv4:

```bash
export NODE_OPTIONS='--dns-result-order=ipv4first'
pnpm -F @minimal-rpg/db db:migrate
```

## 4. Seed data (optional)

If you want dev seed data in staging:

```bash
export DATABASE_URL='postgres://...sslmode=require'
pnpm -F @minimal-rpg/db db:seed
```

## 5. Next: set Fly secrets

Once you have `DATABASE_URL`:

```bash
flyctl secrets set \
  -a arcagentic \
  DATABASE_URL="postgres://...sslmode=require" \
  AUTH_SECRET="..." \
  OPENROUTER_API_KEY="..." \
  OPENROUTER_MODEL="deepseek/deepseek-chat"
```
