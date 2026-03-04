import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SharedParticleEdgeDefs from '../components/SharedParticleEdgeDefs';

afterEach(cleanup);

describe('SharedParticleEdgeDefs', () => {
  it('renders an SVG element with defs', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    const defs = svg!.querySelector('defs');
    expect(defs).toBeInTheDocument();
  });

  it('contains particle-glow filter with correct ID', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const filter = container.querySelector('#particle-glow');
    expect(filter).toBeInTheDocument();
    expect(filter!.tagName.toLowerCase()).toBe('filter');
  });

  it('contains text-glow filter with correct ID', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const filter = container.querySelector('#text-glow');
    expect(filter).toBeInTheDocument();
    expect(filter!.tagName.toLowerCase()).toBe('filter');
  });

  it('particle-glow filter has feGaussianBlur with stdDeviation 6', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const filter = container.querySelector('#particle-glow');
    const blur = filter!.querySelector('feGaussianBlur');
    expect(blur).toBeInTheDocument();
    expect(blur!.getAttribute('stdDeviation')).toBe('6');
  });

  it('text-glow filter has feGaussianBlur with stdDeviation 3', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const filter = container.querySelector('#text-glow');
    const blur = filter!.querySelector('feGaussianBlur');
    expect(blur).toBeInTheDocument();
    expect(blur!.getAttribute('stdDeviation')).toBe('3');
  });

  it('removes defs from DOM on unmount', () => {
    const { container, unmount } = render(<SharedParticleEdgeDefs />);
    expect(container.querySelector('#particle-glow')).toBeInTheDocument();
    expect(container.querySelector('#text-glow')).toBeInTheDocument();

    unmount();

    expect(container.querySelector('#particle-glow')).not.toBeInTheDocument();
    expect(container.querySelector('#text-glow')).not.toBeInTheDocument();
  });

  it('renders hidden SVG that does not take up space', () => {
    const { container } = render(<SharedParticleEdgeDefs />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ position: 'absolute', width: '0', height: '0' });
  });
});
