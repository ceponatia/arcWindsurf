/**
 * Prefab Builder Feature
 * Canvas-based prefab editor with drag & drop locations.
 */

// Main component
export { PrefabBuilder } from './PrefabBuilder.js';

// Sub-components for customization
export { PrefabCanvas } from './PrefabCanvas.js';
export { LocationBucket } from './LocationBucket.js';
export { PropertiesPanel } from './PropertiesPanel.js';
export { LocationNodeComponent, EntryNodeComponent } from './CanvasNodes.js';

// Store
export { usePrefabBuilderStore } from './store.js';

// Types
export type {
  LocationNodeData,
  EntryNodeData,
  PrefabCanvasNode,
  PendingConnection,
  PrefabBuilderState,
  PrefabBuilderActions,
  PrefabBuilderProps,
} from './types.js';

export { calculateDirection, isVerticalDirection } from './types.js';
