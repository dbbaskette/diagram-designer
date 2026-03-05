import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DiagramView from '../components/DiagramView';
import type { DiagramConfig } from '../types/diagram';

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('../context/MetricsContext', () => ({
  useMetrics: () => ({ setDependencyGraph: vi.fn() }),
}));

vi.mock('../utils/dependencyGraph', () => ({
  buildDependencyGraph: () => new Map(),
}));

vi.mock('../utils/autoLayout', () => ({
  applyDagreLayout: (nodes: unknown[]) => nodes,
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

vi.mock('reactflow', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MiniMap: () => null,
    Controls: () => null,
    Background: () => null,
    Panel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNodesState: (initial: any[]) => {
      const [nodes, setNodes] = React.useState(initial);
      return [nodes, setNodes, vi.fn()];
    },
    useEdgesState: (initial: any[]) => {
      const [edges, setEdges] = React.useState(initial);
      return [edges, setEdges, vi.fn()];
    },
    addEdge: vi.fn(),
    BackgroundVariant: { Dots: 'dots' },
    useReactFlow: () => ({ getNodes: () => [] }),
    getRectOfNodes: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    getTransformForBounds: () => [0, 0, 1],
  };
});

const initialConfig: DiagramConfig = {
  config: {
    layout: 'horizontal',
    updateInterval: 5000,
    title: 'Test Diagram',
  },
  nodes: [
    {
      name: 'node-a',
      displayName: 'Node A',
      description: 'A',
      icon: 'fas fa-server',
      dataGrid: [],
      connectTo: [],
      lineType: 'solid',
      lineColor: '#000000',
      particles: { enabled: false },
    },
  ],
};

describe('DiagramView filter URL sync', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/');
  });

  it('reads initial filters from URL and syncs updates back to query params', async () => {
    window.history.pushState(null, '', '/?search=node-a&health=down');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    render(
      <DiagramView
        selectedDiagram="test.json"
        showCoordinates={false}
        initialConfig={initialConfig}
      />
    );

    const searchInput = await screen.findByTestId('node-search-input');
    expect((searchInput as HTMLInputElement).value).toBe('node-a');
    expect(screen.getByTestId('health-filter-down')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(searchInput, { target: { value: 'node' } });
    fireEvent.click(screen.getByTestId('health-filter-up'));

    await waitFor(() => {
      const calls = replaceStateSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const latestUrl = String(calls[calls.length - 1][2]);
      expect(latestUrl).toContain('search=node');
      expect(latestUrl).toContain('health=up');
    });

    replaceStateSpy.mockRestore();
  });
});
