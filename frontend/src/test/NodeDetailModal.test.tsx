import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NodeDetailModal from '../components/NodeDetailModal';
import type { NodeDetailConfig } from '../components/NodeDetailModal';
import type { NodeData } from '../types/diagram';

const baseNodeData: NodeData = {
  name: 'test-node',
  displayName: 'Test Node',
  description: 'A test node',
  icon: 'server',
  dataGrid: [],
  connectTo: [],
  lineType: 'solid',
  lineColor: '#3498db',
  particles: { enabled: false },
  config: {
    layout: 'horizontal',
    updateInterval: 5000,
    title: 'Test',
  },
};

describe('NodeDetailModal', () => {
  it('renders markdown content as HTML', () => {
    const config: NodeDetailConfig = {
      title: 'Markdown Test',
      customPage: {
        type: 'markdown',
        content: '# Hello\n\nThis is **bold** text.',
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    const heading = document.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe('Hello');

    const bold = document.querySelector('strong');
    expect(bold).not.toBeNull();
    expect(bold!.textContent).toBe('bold');
  });

  it('sanitizes HTML customPage content', () => {
    const config: NodeDetailConfig = {
      title: 'HTML Test',
      customPage: {
        type: 'html',
        content: '<p>Safe</p><script>alert("xss")</script>',
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.querySelector('p')!.textContent).toBe('Safe');
    expect(document.querySelector('script')).toBeNull();
  });

  it('sanitizes section HTML content', () => {
    const config: NodeDetailConfig = {
      title: 'Section Test',
      sections: [
        {
          title: 'Info',
          type: 'info',
          content: '<div class="safe">OK</div><img src="x" onerror="alert(1)">',
        },
      ],
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    const safeDiv = document.querySelector('.safe');
    expect(safeDiv).not.toBeNull();
    expect(safeDiv!.textContent).toBe('OK');

    // onerror should be stripped
    const img = document.querySelector('img');
    if (img) {
      expect(img.hasAttribute('onerror')).toBe(false);
    }
  });

  it('does not render when isOpen is false', () => {
    const config: NodeDetailConfig = {
      title: 'Hidden',
      customPage: { type: 'html', content: '<p>Should not appear</p>' },
    };

    const { container } = render(
      <NodeDetailModal
        isOpen={false}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders kpi-card components with trend indicators', () => {
    const config: NodeDetailConfig = {
      title: 'KPI Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'kpi-card',
            key: 'Requests/sec',
            value: '12,847',
            trend: 'up',
            trend_value: '+8.3%',
            subtitle: 'vs last hour',
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.body.textContent).toContain('12,847');
    expect(document.body.textContent).toContain('Requests/sec');
    expect(document.body.textContent).toContain('+8.3%');
  });

  it('renders tabs component with switchable panels', () => {
    const config: NodeDetailConfig = {
      title: 'Tabs Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'tabs',
            tabs: [
              {
                label: 'Tab One',
                components: [
                  { type: 'stat-row', key: 'Version', value: '2.0' },
                ],
              },
              {
                label: 'Tab Two',
                components: [
                  { type: 'stat-row', key: 'Region', value: 'us-east-1' },
                ],
              },
            ],
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    // Tab buttons should be rendered
    expect(document.body.textContent).toContain('Tab One');
    expect(document.body.textContent).toContain('Tab Two');
    // First tab content should be visible by default
    expect(document.body.textContent).toContain('Version');
    expect(document.body.textContent).toContain('2.0');
  });

  it('renders status-indicator components', () => {
    const config: NodeDetailConfig = {
      title: 'Status Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'status-indicator',
            status: 'healthy',
            key: 'Gateway Core',
            value: 'All instances responding',
          },
          {
            type: 'status-indicator',
            status: 'warning',
            key: 'Rate Limiter',
            value: 'Near threshold',
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.body.textContent).toContain('Gateway Core');
    expect(document.body.textContent).toContain('Rate Limiter');
    expect(document.body.textContent).toContain('Near threshold');
  });

  it('renders table components with columns and rows', () => {
    const config: NodeDetailConfig = {
      title: 'Table Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'table',
            title: 'Instances',
            columns: [
              { header: 'Name', field: 'name' },
              { header: 'CPU', field: 'cpu', align: 'right' },
            ],
            rows: [
              { name: 'gw-01', cpu: '34%' },
              { name: 'gw-02', cpu: '41%' },
            ],
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.body.textContent).toContain('Instances');
    expect(document.body.textContent).toContain('Name');
    expect(document.body.textContent).toContain('CPU');
    expect(document.body.textContent).toContain('gw-01');
    expect(document.body.textContent).toContain('34%');
  });

  it('renders grid layouts with inline gridTemplateColumns and gap styles', () => {
    const config: NodeDetailConfig = {
      title: 'Grid Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'grid',
            grid_cols: 3,
            gap: '2',
            components: [
              { type: 'metric-card', key: 'A', value: '1' },
              { type: 'metric-card', key: 'B', value: '2' },
              { type: 'metric-card', key: 'C', value: '3' },
            ],
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    const grid = document.body.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect((grid as HTMLElement).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect((grid as HTMLElement).style.gap).toBe('0.5rem');
  });

  it('renders chart components', () => {
    const config: NodeDetailConfig = {
      title: 'Chart Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'chart',
            chart_type: 'bar',
            title: 'Traffic by Endpoint',
            data: [
              { label: '/api/users', value: 4200, color: '#3b82f6' },
              { label: '/api/orders', value: 3100, color: '#10b981' },
            ],
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.body.textContent).toContain('Traffic by Endpoint');
    expect(document.body.textContent).toContain('/api/users');
    expect(document.body.textContent).toContain('4200');
    expect(document.body.querySelector('svg')).not.toBeNull();
  });

  it('renders donut chart components using svg circles', () => {
    const config: NodeDetailConfig = {
      title: 'Donut Chart Test',
      customPage: {
        type: 'components',
        layout: [
          {
            type: 'chart',
            chart_type: 'donut',
            title: 'Service Mix',
            data: [
              { label: 'API', value: 40, color: '#3b82f6' },
              { label: 'Workers', value: 35, color: '#10b981' },
              { label: 'Batch', value: 25, color: '#f59e0b' },
            ],
          },
        ],
      },
    };

    render(
      <NodeDetailModal
        isOpen={true}
        onClose={() => {}}
        nodeData={baseNodeData}
        nodeDetails={config}
      />
    );

    expect(document.body.textContent).toContain('Service Mix');
    expect(document.body.querySelectorAll('svg circle').length).toBeGreaterThanOrEqual(3);
  });
});
