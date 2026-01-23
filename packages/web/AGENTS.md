# @minimal-rpg/web

## Purpose

Vite-based React frontend for Minimal RPG. The player-facing web client that communicates with the API backend.

## Scope

- Web frontend pages, routes, and feature components
- Client-side state management (Zustand) and API integration
- Frontend configuration, assets, and Vite build tooling
- Composition of shared UI components

## Package Connections

- **ui**: Imports shared React components
- **schemas**: Uses types for API request/response shapes
- **generator**: Calls generator for character creation
- **utils**: Shared utility functions
- **db**: Indirect dependency through API (web does not call db directly)

## Code Standards

- TypeScript with strict typing
- React with functional components and hooks
- Keep types in domain-level and shared types files where appropriate. Do not define types in-line.
- Use utils from `@minimal-rpg/utils` instead of duplicating logic.
- Prefer to add utils to `@minimal-rpg/utils` instead of scope-specific helpers when possible.

## Data Freshness (Views)

This app uses hash routing and a long-lived controller (`useAppController`) which means list-fetch hooks can stay mounted across navigation.

To keep all views consistent (data is fresh when you enter a view), prefer the shared hook `useRefreshOnViewEnter` in the controller instead of adding per-view inline `useEffect` refresh logic.

- Hook: `packages/web/src/shared/hooks/useRefreshOnViewEnter.ts`
- Usage: `packages/web/src/layouts/hooks/useAppController.ts`

This package is the frontend entry point. All backend communication goes through the API package.
