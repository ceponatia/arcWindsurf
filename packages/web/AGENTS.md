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

This package is the frontend entry point. All backend communication goes through the API package.
