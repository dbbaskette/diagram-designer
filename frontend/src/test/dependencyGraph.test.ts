import { describe, it, expect } from 'vitest';
import { buildDependencyGraph, getNeighbors } from '../utils/dependencyGraph';
import type { DiagramNode } from '../types/diagram';

function makeNode(name: string, connectTo: DiagramNode['connectTo'] = []): DiagramNode {
  return {
    name,
    displayName: name,
    description: '',
    icon: 'server',
    dataGrid: [],
    connectTo,
    lineType: 'solid',
    lineColor: '#3498db',
    particles: { enabled: false },
  };
}

describe('buildDependencyGraph', () => {
  it('returns empty sets for isolated nodes', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const graph = buildDependencyGraph(nodes);

    expect(graph.neighbors.get('A')!.size).toBe(0);
    expect(graph.neighbors.get('B')!.size).toBe(0);
    expect(graph.downstream.get('A')!.size).toBe(0);
    expect(graph.upstream.get('A')!.size).toBe(0);
  });

  it('builds bidirectional neighbors from string connections', () => {
    const nodes = [
      makeNode('A', ['B']),
      makeNode('B'),
    ];
    const graph = buildDependencyGraph(nodes);

    expect(graph.neighbors.get('A')).toEqual(new Set(['B']));
    expect(graph.neighbors.get('B')).toEqual(new Set(['A']));
    expect(graph.downstream.get('A')).toEqual(new Set(['B']));
    expect(graph.upstream.get('B')).toEqual(new Set(['A']));
    expect(graph.downstream.get('B')!.size).toBe(0);
    expect(graph.upstream.get('A')!.size).toBe(0);
  });

  it('builds bidirectional neighbors from object connections', () => {
    const nodes = [
      makeNode('Gateway', [{ target: 'Service', outputHandle: 0, inputHandle: 0 }]),
      makeNode('Service', [{ target: 'Database', outputHandle: 0, inputHandle: 0 }]),
      makeNode('Database'),
    ];
    const graph = buildDependencyGraph(nodes);

    expect(graph.neighbors.get('Gateway')).toEqual(new Set(['Service']));
    expect(graph.neighbors.get('Service')).toEqual(new Set(['Gateway', 'Database']));
    expect(graph.neighbors.get('Database')).toEqual(new Set(['Service']));
  });

  it('ignores connections to unknown nodes', () => {
    const nodes = [makeNode('A', ['NonExistent'])];
    const graph = buildDependencyGraph(nodes);

    expect(graph.neighbors.get('A')!.size).toBe(0);
  });

  it('handles a diamond dependency pattern', () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodes = [
      makeNode('A', ['B', 'C']),
      makeNode('B', ['D']),
      makeNode('C', ['D']),
      makeNode('D'),
    ];
    const graph = buildDependencyGraph(nodes);

    expect(graph.neighbors.get('A')).toEqual(new Set(['B', 'C']));
    expect(graph.neighbors.get('D')).toEqual(new Set(['B', 'C']));
    expect(graph.downstream.get('A')).toEqual(new Set(['B', 'C']));
    expect(graph.upstream.get('D')).toEqual(new Set(['B', 'C']));
  });
});

describe('getNeighbors', () => {
  it('returns neighbors for a known node', () => {
    const nodes = [makeNode('A', ['B']), makeNode('B')];
    const graph = buildDependencyGraph(nodes);

    expect(getNeighbors(graph, 'A')).toEqual(new Set(['B']));
    expect(getNeighbors(graph, 'B')).toEqual(new Set(['A']));
  });

  it('returns empty set for unknown node', () => {
    const nodes = [makeNode('A')];
    const graph = buildDependencyGraph(nodes);

    expect(getNeighbors(graph, 'Unknown').size).toBe(0);
  });
});
