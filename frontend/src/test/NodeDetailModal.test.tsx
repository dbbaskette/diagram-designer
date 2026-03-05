import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
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
});
