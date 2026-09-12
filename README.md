# LIFE//LEVEL

> Turn your real life into a playable character.

A full-stack RPG productivity app: everyday tasks become **quests** that grant
**XP**, **levels**, **character attributes**, **gold** and **streaks**. Gold is
spent in the **Shop** on cosmetic items you can equip on your **Character**.

## Features

- **Authentication** — signup, login, logout, persistent JWT sessions in
  httpOnly cookies, protected routes.
- **Quests** — create, read, update, delete and complete quests with a
  server-authoritative reward engine (the client can never set rewards).
- **RPG progression** — non-linear XP curve (`100 × level^1.5`), automatic
  level-up detection, five attributes (Intellect, Strength, Discipline,
  Creativity, Social), gold, daily streaks and full activity history.
- **Economy** — premium cosmetic shop (profile frames, themes, badges),
  atomic gold purchases and an inventory with equip/unequip rules
  (badges are multi-slot; frames/themes are exclusive per type).
- **Persistence** — SQLite is the single source of truth; refreshing the page
  or logging out/in never loses progress.
- **UI** — responsive (mobile bottom nav + desktop sidebar), accessible,
  with loading skeletons, empty states and friendly error states on every page.

## Architecture

```
frontend/   React 18 + Vite 5 + Tailwind v4 (SPA)
backend/    Node.js + Express 4 (REST API)
  └ prisma/ Prisma ORM + SQLite (database is the source of truth)
```

The API exposes JSON envelopes: `{ "success": true, "data": {...} }` and
`{ "success": false, "error": { "code", "message" } }`. The frontend talks to
`/api`; in development Vite proxies it to the backend. Sessions are JWT tokens
stored in an httpOnly, SameSite cookie — no client-side secrets.

## Tech Stack

| Layer    | Tech |
| -------- | ---- |
| Frontend | React 18, Vite 5, Tailwind CSS 4, Framer Motion, React Router 6, axios |
| Backend  | Node.js, Express 4, express-validator, bcrypt, jsonwebtoken |
| Data     | SQLite via Prisma ORM |
| Auth     | JWT in httpOnly cookies |

## Prerequisites

- Node.js **18+** (tested on Node 24)
- npm

## Installation

```bash
npm run install:all
```

This installs the root, `backend/` and `frontend/` dependencies.

## Environment Variables

Copy the template, then edit the backend variables:

```bash
cp .env.example backend/.env
```

Required backend variables:

| Variable       | Description                                              | Example                    |
| -------------- | -------------------------------------------------------- | -------------------------- |
| `JWT_SECRET`   | Secret used to sign session tokens. **Change in prod.**  | `change-me`                |
| `DATABASE_URL` | SQLite database location (relative to `backend/`).       | `file:./dev.db`            |

Optional backend variables: `PORT` (default `3001`), `NODE_ENV`
(default `development`), `FRONTEND_URL` (CORS origin, default
`http://localhost:5173`).

Optional frontend variable (serve-time/build-time): `VITE_API_URL` — override
for `/api` when the frontend is deployed separately. Defaults to `/api`.

`.env` files are git-ignored. Never commit real secrets.

## Database Setup

```bash
cd backend
npx prisma migrate deploy   # apply migrations to dev.db
npm run seed                # seed the cosmetic shop catalogue (idempotent)
```

Useful Prisma commands:

```bash
npx prisma validate      # validate the schema
npx prisma generate      # (re)generate the client
npx prisma migrate status
npx prisma studio        # inspect the database
```

## Development

```bash
npm run dev
```

Runs the backend (`localhost:3001`) and the frontend (`localhost:5173`)
together. The Vite dev server proxies `/api` to the backend.

## Build

```bash
cd frontend && npm run build
```

Outputs a static bundle to `frontend/dist/`. Preview it locally with
`npm run preview` (in `frontend/`).

## API Overview

| Method   | Endpoint                        | Description                                   |
| -------- | ------------------------------- | --------------------------------------------- |
| POST     | `/api/auth/signup`              | Create account + character                    |
| POST     | `/api/auth/login`               | Log in (sets httpOnly cookie)                 |
| POST     | `/api/auth/logout`              | Clear session                                 |
| GET      | `/api/auth/me`                  | Current user                                  |
| GET      | `/api/quests`                   | List quests (`?status=`, `?category=`)        |
| POST     | `/api/quests`                   | Create quest                                  |
| GET/PUT/DELETE | `/api/quests/:id`         | Read / edit / delete quest                    |
| POST     | `/api/quests/:id/complete`      | Complete quest (awards XP/gold/attribute)     |
| GET      | `/api/character`                | Character level, XP, gold, attributes, streak |
| GET      | `/api/activity`                 | Progression history (`?limit=`)               |
| GET      | `/api/shop`                     | Cosmetic catalogue + gold balance             |
| POST     | `/api/shop/:itemId/purchase`    | Buy an item (gold deducted atomically)        |
| GET      | `/api/inventory`                | Owned items                                   |
| POST     | `/api/inventory/:id/equip`      | Equip an owned item (`:id` = OwnedItem id)    |
| POST     | `/api/inventory/:id/unequip`    | Unequip an owned item                         |
| GET      | `/api/health`                   | Health check                                  |

All routes except `signup`/`login`/`logout`/`health` require the session
cookie. Routed data (quests, character, activity, inventory) is always scoped
to the authenticated user; RPG reward values are always derived server-side.

## Deployment Notes

Production is not deployed yet. The recommended configuration:

- **Frontend** → Vercel. Add a rewrite so `/api/*` targets the backend, or set
  `VITE_API_URL` when building. A Vercel rewrite keeps the session cookie
  same-site (simplest); a direct `VITE_API_URL` cross-origin setup requires
  the backend cookie to use `Secure` + `SameSite=None` (already enabled when
  `NODE_ENV=production`) and `FRONTEND_URL` set to the deployed origin.
- **Backend** → Render or Railway. Set `JWT_SECRET`, `FRONTEND_URL`,
  `NODE_ENV=production`, and run `npx prisma migrate deploy && npm run seed`
  as the start/init step (or a build step for Prisma clients).
- **Database** → managed PostgreSQL for production. The schema is
  provider-agnostic; to migrate from the local SQLite `dev.db`:
  1. Switch the datasource in `backend/prisma/schema.prisma` to `postgresql`
     and set `DATABASE_URL`.
  2. Run `npx prisma migrate dev` to create the production migration.
  3. Re-run the seed. No application code changes are required.

## Demo Flow

1. Open the app, **sign up**.
2. From the **Dashboard**, create a **quest** (pick a category + difficulty).
3. **Complete** it — watch XP, gold, the mapped attribute and your streak tick
   up, and the activity feed update.
4. Complete a few more quests to earn gold.
5. Open the **Shop**, **purchase** a cosmetic item.
6. Go to **Character → Inventory** and **equip** it.
7. **Refresh** the page or **log out and back in** — everything persists.

---

Built for a hackathon with a focus on stability, security and persistence.