import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ParticleEdge from '../components/ParticleEdge';

afterEach(cleanup);

const defaultProps = {
  id: 'edge-1',
  sourceX: 0,
  sourceY: 0,
  targetX: 200,
  targetY: 100,
};

// ParticleEdge renders raw SVG elements, so we wrap in an <svg> for valid DOM
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

describe('ParticleEdge', () => {
  it('renders a path element', () => {
    const { container } = renderInSvg(<ParticleEdge {...defaultProps} />);
    const path = container.querySelector('path.react-flow__edge-path');
    expect(path).toBeInTheDocument();
    expect(path!.getAttribute('id')).toBe('edge-1');
  });

  it('does not render particles when disabled', () => {
    const { container } = renderInSvg(
      <ParticleEdge {...defaultProps} data={{ particles: { enabled: false } }} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(0);
  });

  it('renders particles when enabled', () => {
    const { container } = renderInSvg(
      <ParticleEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 3, color: '#ff0000' } }}
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('particle circles reference shared url(#particle-glow) filter', () => {
    const { container } = renderInSvg(
      <ParticleEdge
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
      <ParticleEdge
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
      <ParticleEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 1, label: 'API' } }}
      />
    );
    // The label is a standalone <text> with filter="url(#text-glow)"
    const labels = container.querySelectorAll('text[filter="url(#text-glow)"]');
    expect(labels.length).toBe(1);
    expect(labels[0].textContent).toBe('API');
  });

  it('does not render inline defs (filters are shared)', () => {
    const { container } = renderInSvg(
      <ParticleEdge
        {...defaultProps}
        data={{ particles: { enabled: true, count: 3 } }}
      />
    );
    // ParticleEdge should NOT contain its own <defs> — they come from SharedParticleEdgeDefs
    const defs = container.querySelectorAll('defs');
    expect(defs.length).toBe(0);
  });
});
