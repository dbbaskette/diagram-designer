import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    ReactFlow: ({ nodes, children }: { nodes: any[]; children: React.ReactNode }) => (
      <div>
        <div data-testid="show-coordinates-json">
          {JSON.stringify(nodes.map((node) => ({ id: node.id, showCoordinates: node.data?.showCoordinates })))}
        </div>
        {children}
      </div>
    ),
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

describe('DiagramView showCoordinates updates', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/');
  });

  it('updates existing nodes when showCoordinates toggles', async () => {
    const { rerender } = render(
      <DiagramView
        selectedDiagram="test.json"
        showCoordinates={false}
        initialConfig={initialConfig}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('show-coordinates-json').textContent).toContain('"showCoordinates":false');
    });

    rerender(
      <DiagramView
        selectedDiagram="test.json"
        showCoordinates={true}
        initialConfig={initialConfig}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('show-coordinates-json').textContent).toContain('"showCoordinates":true');
    });
  });
});
