# @minimal-rpg/api

## Purpose

The HTTP backend server for the Minimal RPG application. It exposes REST endpoints using the Hono framework, handling request routing, authentication, validation, and delegation to domain-specific packages. It serves as the entry point for client interactions.

## Core Responsibilities

- **HTTP Server**: Hono-based server with CORS and middleware support.
- **Authentication**: JWT-based auth with middleware for protected routes (`src/auth`).
- **Data Loading**: Loads initial character and setting data on startup (`src/data`).
- **Routing**: Organized route handlers for various domains (`src/routes`).
- **Configuration**: Manages runtime configuration and environment variables (`src/util/config.ts`).

## Key Route Groups

- **Auth**: Authentication and user management (`routes/auth.ts`).
- **Sessions**: Game session management (`routes/sessions/`).
- **Turns**: Turn processing and history (`routes/turns.ts`).
- **Admin**: Database and session administration (`routes/adminDb.ts`, `routes/adminSessions.ts`).
- **Entities**: Management of items, personas, tags, and location maps.
- **User Preferences**: Handling user-specific settings (`routes/userPreferences.ts`).
- **Hygiene**: System health and maintenance endpoints (`routes/hygiene.ts`).
- **Workspace Drafts**: Managing drafts for content creation (`routes/workspaceDrafts.ts`).

## Architecture

- **Entry Point**: `src/server.ts` initializes the environment and starts the server defined in `src/serverImpl.ts`.
- **Middleware**: Uses Hono middleware for error handling, CORS, and authentication (`attachAuthUser`, `requireAuthIfEnabled`).
- **Data Access**: Interacts with `@minimal-rpg/db` for persistence and loads static data from `src/data`.

## Package Connections

- **@minimal-rpg/bus**: World Bus for emitting, persisting, and replaying domain events.
- **@minimal-rpg/actors**: Runtime NPC/player actor registry used by turn handling.
- **@minimal-rpg/services**: Domain services (physics, time, social, rules) used during turns.
- **@minimal-rpg/projections**: Read models for NPC state, locations, and sessions.
- **@minimal-rpg/db**: Direct database access for CRUD operations.
- **@minimal-rpg/schemas**: Shared Zod schemas for request/response validation.
- **@minimal-rpg/characters**: Character data structures and logic.
