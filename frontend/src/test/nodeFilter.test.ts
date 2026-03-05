import { describe, it, expect } from 'vitest';
import type { Node, Edge } from 'reactflow';
import {
  getVisibleNodeIds,
  applyNodeVisibility,
  applyEdgeVisibility,
  countNodesByStatus,
} from '../utils/nodeFilter';
import type { NodeStatus } from '../utils/nodeStatus';

function makeNode(id: string, displayName?: string): Node {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { name: id, displayName: displayName ?? id },
  };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe('getVisibleNodeIds', () => {
  const nodes = [
    makeNode('api-gateway', 'API Gateway'),
    makeNode('auth-service', 'Auth Service'),
    makeNode('database', 'PostgreSQL DB'),
  ];

  it('returns all nodes when no filters are active', () => {
    const result = getVisibleNodeIds(nodes, '', 'all', new Map());
    expect(result.size).toBe(3);
  });

  it('filters by search query matching name', () => {
    const result = getVisibleNodeIds(nodes, 'api', 'all', new Map());
    expect(result.size).toBe(1);
    expect(result.has('api-gateway')).toBe(true);
  });

  it('filters by search query matching displayName', () => {
    const result = getVisibleNodeIds(nodes, 'PostgreSQL', 'all', new Map());
    expect(result.size).toBe(1);
    expect(result.has('database')).toBe(true);
  });

  it('search is case-insensitive', () => {
    const result = getVisibleNodeIds(nodes, 'AUTH', 'all', new Map());
    expect(result.size).toBe(1);
    expect(result.has('auth-service')).toBe(true);
  });

  it('filters by health status up', () => {
    const statuses = new Map<string, NodeStatus>([
      ['api-gateway', 'up'],
      ['auth-service', 'down'],
      ['database', 'up'],
    ]);
    const result = getVisibleNodeIds(nodes, '', 'up', statuses);
    expect(result.size).toBe(2);
    expect(result.has('api-gateway')).toBe(true);
    expect(result.has('database')).toBe(true);
  });

  it('filters by health status down', () => {
    const statuses = new Map<string, NodeStatus>([
      ['api-gateway', 'up'],
      ['auth-service', 'down'],
      ['database', 'up'],
    ]);
    const result = getVisibleNodeIds(nodes, '', 'down', statuses);
    expect(result.size).toBe(1);
    expect(result.has('auth-service')).toBe(true);
  });

  it('treats missing status as unknown', () => {
    const result = getVisibleNodeIds(nodes, '', 'unknown', new Map());
    expect(result.size).toBe(3);
  });

  it('combines search and health filter', () => {
    const statuses = new Map<string, NodeStatus>([
      ['api-gateway', 'up'],
      ['auth-service', 'up'],
      ['database', 'down'],
    ]);
    const result = getVisibleNodeIds(nodes, 'service', 'up', statuses);
    expect(result.size).toBe(1);
    expect(result.has('auth-service')).toBe(true);
  });

  it('returns empty set when nothing matches', () => {
    const result = getVisibleNodeIds(nodes, 'nonexistent', 'all', new Map());
    expect(result.size).toBe(0);
  });
});

describe('applyNodeVisibility', () => {
  it('dims non-matching nodes instead of hiding them', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const visible = new Set(['a', 'c']);
    const result = applyNodeVisibility(nodes, visible);

    expect(result[0].hidden).toBe(false);
    expect(result[1].hidden).toBe(false);
    expect(result[2].hidden).toBe(false);

    expect(result[0].style?.opacity).toBe(1);
    expect(result[1].style?.opacity).toBe(0.5);
    expect(result[2].style?.opacity).toBe(1);

    expect(result[0].data.dimmed).toBe(false);
    expect(result[1].data.dimmed).toBe(true);
    expect(result[2].data.dimmed).toBe(false);
  });
});

describe('applyEdgeVisibility', () => {
  it('dims edges where source is dimmed', () => {
    const edges = [makeEdge('a', 'b')];
    const visible = new Set(['b']);
    const result = applyEdgeVisibility(edges, visible);
    expect(result[0].hidden).toBe(false);
    expect(result[0].style?.opacity).toBe(0.35);
  });

  it('dims edges where target is dimmed', () => {
    const edges = [makeEdge('a', 'b')];
    const visible = new Set(['a']);
    const result = applyEdgeVisibility(edges, visible);
    expect(result[0].hidden).toBe(false);
    expect(result[0].style?.opacity).toBe(0.35);
  });

  it('keeps full opacity when both source and target are visible', () => {
    const edges = [makeEdge('a', 'b')];
    const visible = new Set(['a', 'b']);
    const result = applyEdgeVisibility(edges, visible);
    expect(result[0].hidden).toBe(false);
    expect(result[0].style?.opacity).toBe(1);
  });
});

describe('countNodesByStatus', () => {
  it('counts nodes by their status', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const statuses = new Map<string, NodeStatus>([
      ['a', 'up'],
      ['b', 'up'],
      ['c', 'down'],
      // d has no status → unknown
    ]);
    const counts = countNodesByStatus(nodes, statuses);
    expect(counts.total).toBe(4);
    expect(counts.up).toBe(2);
    expect(counts.down).toBe(1);
    expect(counts.unknown).toBe(1);
  });

  it('handles empty nodes', () => {
    const counts = countNodesByStatus([], new Map());
    expect(counts.total).toBe(0);
    expect(counts.up).toBe(0);
    expect(counts.down).toBe(0);
    expect(counts.unknown).toBe(0);
  });
});
