import type { Node, Edge } from 'reactflow';
import type { HealthFilter } from '../components/NodeSearchFilter';
import type { NodeStatus } from './nodeStatus';

/**
 * Determines which node IDs should be visible based on search query and health filter.
 * Returns the set of visible node IDs.
 */
export function getVisibleNodeIds(
  nodes: Node[],
  searchQuery: string,
  healthFilter: HealthFilter,
  nodeStatuses: Map<string, NodeStatus>
): Set<string> {
  const query = searchQuery.toLowerCase().trim();

  const visible = new Set<string>();

  for (const node of nodes) {
    const name: string = node.data?.name ?? node.id;
    const displayName: string = node.data?.displayName ?? '';

    // Search filter
    if (query) {
      const matchesSearch =
        name.toLowerCase().includes(query) ||
        displayName.toLowerCase().includes(query);
      if (!matchesSearch) continue;
    }

    // Health filter
    if (healthFilter !== 'all') {
      const status = nodeStatuses.get(node.id) ?? 'unknown';
      if (status !== healthFilter) continue;
    }

    visible.add(node.id);
  }

  return visible;
}

/**
 * Applies visibility to nodes by setting the `hidden` property.
 */
export function applyNodeVisibility(nodes: Node[], visibleIds: Set<string>): Node[] {
  return nodes.map((node) => ({
    ...node,
    hidden: !visibleIds.has(node.id),
  }));
}

/**
 * Hides edges where either source or target is hidden.
 */
export function applyEdgeVisibility(edges: Edge[], visibleNodeIds: Set<string>): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    hidden: !visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target),
  }));
}

/**
 * Counts nodes by health status.
 */
export function countNodesByStatus(
  nodes: Node[],
  nodeStatuses: Map<string, NodeStatus>
): Record<NodeStatus | 'total', number> {
  const counts: Record<NodeStatus | 'total', number> = {
    up: 0,
    down: 0,
    unknown: 0,
    total: nodes.length,
  };

  for (const node of nodes) {
    const status = nodeStatuses.get(node.id) ?? 'unknown';
    counts[status]++;
  }

  return counts;
}
