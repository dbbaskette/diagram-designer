import type { DiagramNode } from '../types/diagram';

export interface DependencyGraph {
  /** All direct neighbors (upstream + downstream) for each node name */
  neighbors: Map<string, Set<string>>;
  /** Nodes that this node connects TO (downstream) */
  downstream: Map<string, Set<string>>;
  /** Nodes that connect TO this node (upstream) */
  upstream: Map<string, Set<string>>;
}

/**
 * Build a bidirectional dependency graph from diagram node config.
 * Each node's `connectTo` array defines outbound connections.
 */
export function buildDependencyGraph(nodes: DiagramNode[]): DependencyGraph {
  const neighbors = new Map<string, Set<string>>();
  const downstream = new Map<string, Set<string>>();
  const upstream = new Map<string, Set<string>>();

  // Initialize sets for all known nodes
  for (const node of nodes) {
    neighbors.set(node.name, new Set());
    downstream.set(node.name, new Set());
    upstream.set(node.name, new Set());
  }

  // Build edges from connectTo arrays
  for (const node of nodes) {
    for (const connection of node.connectTo) {
      const target = typeof connection === 'string' ? connection : connection.target;

      // Only add if target is a known node
      if (!neighbors.has(target)) continue;

      // node -> target (downstream from node's perspective)
      downstream.get(node.name)!.add(target);
      upstream.get(target)!.add(node.name);

      // Both are neighbors of each other
      neighbors.get(node.name)!.add(target);
      neighbors.get(target)!.add(node.name);
    }
  }

  return { neighbors, downstream, upstream };
}

/**
 * Get all direct neighbors of a node (both upstream and downstream).
 */
export function getNeighbors(graph: DependencyGraph, nodeName: string): Set<string> {
  return graph.neighbors.get(nodeName) ?? new Set();
}
