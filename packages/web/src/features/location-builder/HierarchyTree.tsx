/**
 * HierarchyTree Component
 * Tree view for location hierarchy with drag-and-drop support.
 */
import { useState, useMemo } from 'react';
import type { LocationNode, LocationType } from '@minimal-rpg/schemas';
import { ChevronDown, ChevronRight, MapPin, Building2, DoorOpen, Plus, Trash2 } from 'lucide-react';

/** Tree node with computed children */
interface TreeNode extends LocationNode {
  children: TreeNode[];
}

interface HierarchyTreeProps {
  nodes: LocationNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onAddChild: (parentId: string | null, type: LocationType) => void;
  onDeleteNode: (nodeId: string) => void;
}

/** Get icon for location type */
function getTypeIcon(type: LocationType): React.ReactNode {
  switch (type) {
    case 'region':
      return <MapPin className="h-4 w-4 text-blue-500" />;
    case 'building':
      return <Building2 className="h-4 w-4 text-amber-500" />;
    case 'room':
      return <DoorOpen className="h-4 w-4 text-emerald-500" />;
    default:
      return <MapPin className="h-4 w-4 text-gray-500" />;
  }
}

/** Get allowed child types for a location type */
function getAllowedChildTypes(type: LocationType | null): LocationType[] {
  if (type === null) return ['region'];
  switch (type) {
    case 'region':
      return ['region', 'building'];
    case 'building':
      return ['building', 'room'];
    case 'room':
      return []; // Rooms cannot have children
    default:
      return [];
  }
}

/** Build tree structure from flat nodes */
function buildTree(nodes: LocationNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create TreeNode objects
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: build tree structure
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        // Orphaned node - treat as root
        roots.push(treeNode);
      }
    }
  }

  // Sort children by type (region > building > room), then by name
  const typeOrder: Record<LocationType, number> = { region: 0, building: 1, room: 2 };
  const sortNodes = (a: TreeNode, b: TreeNode) => {
    const typeCompare = typeOrder[a.type] - typeOrder[b.type];
    if (typeCompare !== 0) return typeCompare;
    return a.name.localeCompare(b.name);
  };

  const sortChildren = (node: TreeNode): void => {
    node.children.sort(sortNodes);
    for (const child of node.children) {
      sortChildren(child);
    }
  };

  roots.sort(sortNodes);
  for (const root of roots) {
    sortChildren(root);
  }

  return roots;
}

/** Single tree item component */
interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onAddChild: (parentId: string | null, type: LocationType) => void;
  onDeleteNode: (nodeId: string) => void;
}

function TreeItem({
  node,
  depth,
  selectedNodeId,
  expandedIds,
  onToggleExpand,
  onSelectNode,
  onAddChild,
  onDeleteNode,
}: TreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const allowedChildTypes = getAllowedChildTypes(node.type);
  const canHaveChildren = allowedChildTypes.length > 0;
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div>
      {/* Node row */}
      <div
        className={`group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => { onSelectNode(node.id); }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Type icon */}
        {getTypeIcon(node.type)}

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canHaveChildren && (
            <div className="relative">
              <button
                className="p-1 hover:bg-gray-200 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  const firstChildType = allowedChildTypes[0];
                  if (allowedChildTypes.length === 1 && firstChildType) {
                    onAddChild(node.id, firstChildType);
                  } else {
                    setShowAddMenu(!showAddMenu);
                  }
                }}
                title="Add child location"
              >
                <Plus className="h-3.5 w-3.5 text-gray-500" />
              </button>

              {/* Add menu dropdown */}
              {showAddMenu && allowedChildTypes.length > 1 && (
                <div className="absolute right-0 top-full z-10 mt-1 bg-white border rounded shadow-lg py-1 min-w-[120px]">
                  {allowedChildTypes.map((type) => (
                    <button
                      key={type}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(node.id, type);
                        setShowAddMenu(false);
                      }}
                    >
                      {getTypeIcon(type)}
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="p-1 hover:bg-red-100 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            title="Delete location"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children (if expanded) */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelectNode={onSelectNode}
              onAddChild={onAddChild}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Main hierarchy tree component */
export function HierarchyTree({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddChild,
  onDeleteNode,
}: HierarchyTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const toggleExpand = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with add root button */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="font-medium text-sm">Locations</span>
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          onClick={() => { onAddChild(null, 'region'); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Region
        </button>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-auto py-2">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <MapPin className="h-8 w-8 mb-2 text-gray-300" />
            <p>No locations yet</p>
            <button
              className="mt-2 text-blue-600 hover:underline"
              onClick={() => onAddChild(null, 'region')}
            >
              Add your first region
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelectNode={onSelectNode}
              onAddChild={onAddChild}
              onDeleteNode={onDeleteNode}
            />
          ))
        )}
      </div>
    </div>
  );
}
