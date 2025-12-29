# @minimal-rpg/generator

## Purpose

Random content generation for game entities. Creates characters (and future entity types) using themed value pools with configurable biases.

## Scope

- Random generation logic for characters and future domains
- Theme definitions, value pools, and weighting/bias configurations
- Generation utilities, filters, and composition helpers
- Generator-specific types and abstractions

## Package Connections

- **schemas**: Uses `CharacterProfile` and related types for generated output
- **web**: Web client calls generator for character creation UI
