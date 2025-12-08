/**
 * Shared schemas - common types used across character and persona schemas
 */

// Core identity fields
export { GENDERS, CoreIdentitySchema, type CoreIdentity, type Gender } from './basics.js';

// Physical appearance/physique
export {
  APPEARANCE_HEIGHTS,
  APPEARANCE_TORSOS,
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_FEET_SIZES,
  APPEARANCE_LEGS_BUILD,
  BuildSchema,
  AppearanceSchema,
  PhysiqueSchema,
  type AppearanceHeight,
  type AppearanceTorso,
  type AppearanceArmsBuild,
  type AppearanceArmsLength,
  type AppearanceLegsLength,
  type AppearanceFeetSize,
  type AppearanceLegsBuild,
  type Build,
  type Appearance,
  type Physique,
} from './physique.js';
