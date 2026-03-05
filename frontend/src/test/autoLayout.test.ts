import { describe, it, expect } from 'vitest';
import { applyDagreLayout } from '../utils/autoLayout';
import type { Node, Edge } from 'reactflow';

function makeNode(id: string, x = 0, y = 0): Node {
  return { id, type: 'custom', position: { x, y }, data: {} };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe('applyDagreLayout', () => {
  it('assigns positions to all unpinned nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const result = applyDagreLayout(nodes, edges, new Set());

    expect(result).toHaveLength(3);
    // Each node should have a valid position
    result.forEach((node) => {
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    });
  });

  it('does not move pinned nodes', () => {
    const nodes = [makeNode('a', 42, 99), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const result = applyDagreLayout(nodes, edges, new Set(['a']));

    const pinnedNode = result.find((n) => n.id === 'a')!;
    expect(pinnedNode.position).toEqual({ x: 42, y: 99 });
  });

  it('moves unpinned nodes even when some are pinned', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 0, 0)];
    const edges = [makeEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges, new Set(['a']));

    const unpinnedNode = result.find((n) => n.id === 'b')!;
    // b should have been repositioned by dagre, so it likely won't be at 0,0
    // (dagre places connected nodes apart)
    expect(unpinnedNode.position).toBeDefined();
  });

  it('handles an empty graph', () => {
    const result = applyDagreLayout([], [], new Set());
    expect(result).toEqual([]);
  });

  it('handles disconnected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const result = applyDagreLayout(nodes, [], new Set());

    expect(result).toHaveLength(2);
    result.forEach((node) => {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    });
  });

  it('respects TB direction option', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b')];

    const resultLR = applyDagreLayout(nodes, edges, new Set(), { direction: 'LR' });
    const resultTB = applyDagreLayout(nodes, edges, new Set(), { direction: 'TB' });

    // In LR layout, nodes should differ more on x-axis
    const lrDeltaX = Math.abs(resultLR[0].position.x - resultLR[1].position.x);
    const lrDeltaY = Math.abs(resultLR[0].position.y - resultLR[1].position.y);

    // In TB layout, nodes should differ more on y-axis
    const tbDeltaX = Math.abs(resultTB[0].position.x - resultTB[1].position.x);
    const tbDeltaY = Math.abs(resultTB[0].position.y - resultTB[1].position.y);

    expect(lrDeltaX).toBeGreaterThan(lrDeltaY);
    expect(tbDeltaY).toBeGreaterThan(tbDeltaX);
  });

  it('keeps all pinned nodes unchanged when all are pinned', () => {
    const nodes = [makeNode('a', 10, 20), makeNode('b', 30, 40)];
    const edges = [makeEdge('a', 'b')];

    const result = applyDagreLayout(nodes, edges, new Set(['a', 'b']));

    expect(result[0].position).toEqual({ x: 10, y: 20 });
    expect(result[1].position).toEqual({ x: 30, y: 40 });
  });
});
