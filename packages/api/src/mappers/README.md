# Mappers

Data transformation functions that convert between database/domain models and API DTOs.

## Overview

Provides clean separation between internal data representations and API response shapes.

## Exports

- **sessionMappers.ts** — `mapSessionListItem` transforms session records into API list items with optional character/setting names
- **profileMappers.ts** — `mapCharacterSummary`, `mapSettingSummary` transform full profiles into lightweight summaries
- **messageMappers.ts** — Message transformation utilities
- **itemMappers.ts** — Item-related transformations
