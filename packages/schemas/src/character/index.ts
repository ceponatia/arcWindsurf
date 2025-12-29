// Character submodule barrel: flat re-exports only
// Physical description (build + appearance buckets)
export * from './appearance.js';

// Body region taxonomy (canonical regions + aliases)
export * from './regions.js';

// Body region groups for batch hygiene updates
export * from './body-region-groups.js';

// Sensory data schemas (scent, texture, visual, flavor)
export * from './sensory.js';

// Default sensory data (tiered scent defaults)
export * from './scent-defaults.js';

// Other character facets
export * from './basics.js';
export * from './details.js';
export * from './characterProfile.js';

// Personality system (Big Five + traits + prompts)
export * from './personality.js';
