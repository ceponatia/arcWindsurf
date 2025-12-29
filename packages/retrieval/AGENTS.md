# @minimal-rpg/retrieval

## Purpose

Knowledge retrieval and semantic search. Decomposes profiles into knowledge nodes, computes embeddings, and retrieves relevant context based on player input.

## Scope

- Knowledge node extraction from profiles
- Embedding, scoring, salience tracking, and decay/boost logic
- Retrieval services for querying and ranking nodes
- Node diffing, filtering, and data transforms

## Package Connections

- **db**: Queries database for knowledge nodes (future: pgvector search)
- **schemas**: Uses profile and node type definitions
- **governor**: Governor invokes retrieval to build context for turns
- **characters**: Extracts nodes from character profiles
