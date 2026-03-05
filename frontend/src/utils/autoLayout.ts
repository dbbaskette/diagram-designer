import dagre from '@dagrejs/dagre';
import type { Node, Edge } from 'reactflow';

export interface AutoLayoutOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

const DEFAULTS: Required<AutoLayoutOptions> = {
  direction: 'LR',
  nodeWidth: 220,
  nodeHeight: 260,
  nodeSep: 80,
  rankSep: 150,
};

/**
 * Compute new positions for unpinned nodes using Dagre layout.
 * Pinned node IDs keep their current positions; the rest are repositioned.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  pinnedNodeIds: Set<string>,
  options: AutoLayoutOptions = {},
): Node[] {
  const opts = { ...DEFAULTS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    if (pinnedNodeIds.has(node.id)) {
      return node;
    }

    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - opts.nodeWidth / 2,
        y: dagreNode.y - opts.nodeHeight / 2,
      },
    };
  });
}
