# Body Regions Schema

## Purpose

This directory defines the canonical list of body regions used throughout the Minimal RPG system. It provides a structured, granular map of the humanoid body, enabling detailed interactions, descriptions, and state management. These regions also contain schema for sensory data, hygiene progression, and appearance attributes.

## Structure

The regions are organized hierarchically by major body groups:

- **Head**: Face, eyes, ears, mouth, hair, etc.
- **Neck**: Neck, throat.
- **Upper Body**: Shoulders, chest, back.
- **Torso**: Abdomen, hips, waist.
- **Arms**: Upper arms, elbows, forearms, wrists, hands.
- **Groin**: Groin, buttocks.
- **Legs**: Thighs, knees, shins, calves.
- **Feet**: Ankles, heels, feet, toes.

## Usage in Role-Playing

### 1. Sensory Descriptions

These regions serve as specific targets for sensory inputs.

- **Scent**: Hygiene and scents can be localized (e.g., "mud on the left boot" vs "perfume on the neck").
- **Touch**: Tactile sensations are mapped to specific regions.
- **Visual**: Character descriptions can be generated with high specificity.

### 2. Hygiene and State

The `BodyRegionGroupKey` allows for batch operations, such as "washing the face" or "cleaning the feet," while the granular `BodyRegion` types allow for specific tracking of dirt, wounds, or modifications.

### 3. Combat and Targeting

Attacks and injuries can be targeted to specific regions, affecting gameplay mechanics (e.g., a leg injury affecting movement, an eye injury affecting perception).

### 4. Equipment Slots

Clothing and armor can be associated with specific regions or groups of regions, ensuring logical layering and coverage.

## Integration

- **Importing**: Use `BODY_REGIONS` for the full flattened list of all valid regions.
- **Grouping**: Use `BODY_REGION_GROUP_KEYS` for high-level categorization.
- **Types**: `BodyRegion` is the union type of all valid region strings.

This schema acts as the source of truth for physical body representation, ensuring consistency across the Generator, State Manager, and UI components.

## Appearance Attributes

Appearance attributes are co-located with their respective body regions. Each region folder contains an `appearance.ts` file defining the specific visual attributes (e.g., `hairColor`, `eyeShape`) relevant to that region.

- **Head**: Hair color/style, Eye color/shape.
- **Neck**: Description (slender, thick).
- **Upper Body**: Breast size/shape, Nipple description.
- **Torso**: Description, Abdomen, Waist, Hips.
- **Arms**: Arm build/length, Hand size/description.
- **Groin**: Description, Buttocks, Genitals.
- **Legs**: Leg build/length.
- **Feet**: Foot size/shape.

These definitions are aggregated in `packages/schemas/src/character/appearance.ts` for use by the Character Builder UI.
