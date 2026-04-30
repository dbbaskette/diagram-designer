import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CustomEdge from '../components/CustomEdge';

afterEach(cleanup);

const defaultProps = {
  id: 'edge-1',
  sourceX: 0,
  sourceY: 0,
  targetX: 200,
  targetY: 100,
};

// CustomEdge renders raw SVG elements, so we wrap in an <svg> for valid DOM
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

describe('CustomEdge', () => {
  it('renders a path element', () => {
    const { container } = renderInSvg(<CustomEdge {...defaultProps} />);
    const path = container.querySelector('path.react-flow__edge-path');
    expect(path).toBeInTheDocument();
    expect(path!.getAttribute('id')).toBe('edge-1');
  });

  it('does not render particles when disabled', () => {
    const { container } = renderInSvg(
      <CustomEdge {...defaultProps} data={{ particles: { enabled: false } }} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(0);
  });

  it('renders particles when enabled', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 3, color: '#ff0000' } }}
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('particle circles reference shared url(#particle-glow) filter', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 2 } }}
      />
    );
    const circles = container.querySelectorAll('circle');
    circles.forEach((circle) => {
      expect(circle.getAttribute('filter')).toBe('url(#particle-glow)');
    });
  });

  it('renders text elements with particle text when provided', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 2, text: 'data' } }}
      />
    );
    const texts = container.querySelectorAll('g > g > text');
    expect(texts.length).toBe(2);
    texts.forEach((text) => {
      expect(text.textContent).toBe('data');
    });
  });

  it('renders static edge label referencing url(#text-glow) filter', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 1, label: 'API' } }}
      />
    );
    const labels = container.querySelectorAll('text[filter="url(#text-glow)"]');
    expect(labels.length).toBe(1);
    expect(labels[0].textContent).toBe('API');
  });

  it('does not render inline defs (filters are shared)', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 3 } }}
      />
    );
    const defs = container.querySelectorAll('defs');
    expect(defs.length).toBe(0);
  });

  it('overrides stroke when sourceStatus is provided (health coloring)', () => {
    const { container } = renderInSvg(
      <CustomEdge
        {...defaultProps}
        style={{ stroke: '#3498db' }}
        data={{ particles: { enabled: false }, sourceStatus: 'down' }}
      />
    );
    const path = container.querySelector('path.react-flow__edge-path') as SVGPathElement;
    expect(path.style.stroke).toBe('#ef4444');
  });
});
