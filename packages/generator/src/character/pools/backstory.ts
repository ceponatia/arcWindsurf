/**
 * Backstory and summary template pools.
 */

// ============================================================================
// Summary Templates
// ============================================================================

/**
 * Summary templates for female characters.
 * Use {name}, {age}, {trait1}, {trait2}, {trait3} for interpolation.
 */
export const SUMMARY_TEMPLATES_FEMALE = [
  '{name} is a {age}-year-old woman with a {trait1} demeanor and {trait2} nature.',
  'A {trait1} and {trait2} young woman, {name} carries herself with quiet confidence.',
  '{name}, {age}, is known for her {trait1} personality and {trait2} approach to life.',
  'At {age}, {name} is a {trait1} woman who values {trait2} above all else.',
  '{name} is a {trait1} {age}-year-old whose {trait2} nature draws people to her.',
  'A {age}-year-old with {trait1} eyes and a {trait2} spirit, {name} makes an impression.',
  '{name} combines a {trait1} exterior with a deeply {trait2} inner world.',
  'Known for being both {trait1} and {trait2}, {name} is a woman of contrasts.',
] as const;

/**
 * Summary templates for male characters.
 */
export const SUMMARY_TEMPLATES_MALE = [
  '{name} is a {age}-year-old man with a {trait1} demeanor and {trait2} nature.',
  'A {trait1} and {trait2} young man, {name} carries himself with quiet confidence.',
  '{name}, {age}, is known for his {trait1} personality and {trait2} approach to life.',
  'At {age}, {name} is a {trait1} man who values {trait2} above all else.',
  '{name} is a {trait1} {age}-year-old whose {trait2} nature draws people to him.',
  'A {age}-year-old with {trait1} eyes and a {trait2} spirit, {name} makes an impression.',
  '{name} combines a {trait1} exterior with a deeply {trait2} inner world.',
  'Known for being both {trait1} and {trait2}, {name} is a man of contrasts.',
] as const;

/**
 * Gender-neutral summary templates.
 */
export const SUMMARY_TEMPLATES_NEUTRAL = [
  '{name} is a {age}-year-old individual with a {trait1} demeanor.',
  'A {trait1} and {trait2} person, {name} approaches life with intention.',
  '{name}, {age}, brings a {trait1} energy to everything they do.',
  'At {age}, {name} has cultivated a reputation for being {trait1} and {trait2}.',
] as const;

// ============================================================================
// Backstory Templates
// ============================================================================

/**
 * Backstory templates with placeholders.
 * Use {name}, {hometown}, {interest}, {event}, {relationship} for interpolation.
 */
export const BACKSTORY_TEMPLATES = [
  '{name} grew up in {hometown}, where they developed a passion for {interest}. A pivotal moment in their life came when {event}, which shaped who they are today.',

  'Raised in {hometown}, {name} always felt drawn to {interest}. Their journey took an unexpected turn when {event}, forever changing their perspective on life.',

  'Coming from {hometown}, {name} discovered their love for {interest} at a young age. The experience of {event} taught them valuable lessons about {relationship}.',

  '{name} spent their formative years in {hometown}, surrounded by {relationship}. Their interest in {interest} became a defining part of their identity, especially after {event}.',

  'Life in {hometown} gave {name} a unique perspective. Between pursuing {interest} and navigating {relationship}, they learned to balance passion with practicality.',

  'After growing up in {hometown}, {name} found solace in {interest}. The challenges of {event} only strengthened their resolve and shaped their character.',
] as const;

/**
 * Hometown options.
 */
export const HOMETOWNS = [
  'a small coastal town',
  'a bustling metropolis',
  'a quiet suburban neighborhood',
  'a rural farming community',
  'a historic city center',
  'a mountain village',
  'a college town',
  'an industrial city',
  'a beach community',
  'a multicultural urban area',
] as const;

/**
 * Interest/hobby options.
 */
export const INTERESTS = [
  'music and the arts',
  'literature and writing',
  'science and discovery',
  'sports and fitness',
  'cooking and culinary arts',
  'technology and innovation',
  'nature and the outdoors',
  'fashion and design',
  'helping others',
  'academic pursuits',
  'creative expression',
  'building things',
] as const;

/**
 * Life events that shape character.
 */
export const LIFE_EVENTS = [
  'they lost someone close to them',
  'they moved to a completely new place',
  'they overcame a significant challenge',
  'they discovered a hidden talent',
  'they formed an unlikely friendship',
  'they faced a major decision',
  'they experienced a moment of profound clarity',
  'they had to start over from scratch',
  'they found their calling',
  'they learned to trust again',
] as const;

/**
 * Relationship contexts.
 */
export const RELATIONSHIPS = [
  'family and loved ones',
  'trust and vulnerability',
  'independence and self-reliance',
  'community and belonging',
  'ambition and sacrifice',
  'love and loss',
  'friendship and loyalty',
  'identity and self-discovery',
] as const;
