import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import NodeSearchFilter from '../components/NodeSearchFilter';
import type { HealthFilter } from '../components/NodeSearchFilter';

afterEach(cleanup);

const defaultProps = {
  searchQuery: '',
  onSearchChange: vi.fn(),
  healthFilter: 'all' as HealthFilter,
  onHealthFilterChange: vi.fn(),
  nodeCounts: { up: 5, down: 2, unknown: 1, total: 8 },
};

describe('NodeSearchFilter', () => {
  it('renders search input and filter buttons', () => {
    render(<NodeSearchFilter {...defaultProps} />);

    expect(screen.getByTestId('node-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('health-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('health-filter-up')).toBeInTheDocument();
    expect(screen.getByTestId('health-filter-down')).toBeInTheDocument();
    expect(screen.getByTestId('health-filter-unknown')).toBeInTheDocument();
  });

  it('displays node counts in filter buttons', () => {
    render(<NodeSearchFilter {...defaultProps} />);

    expect(screen.getByTestId('health-filter-all').textContent).toContain('8');
    expect(screen.getByTestId('health-filter-up').textContent).toContain('5');
    expect(screen.getByTestId('health-filter-down').textContent).toContain('2');
    expect(screen.getByTestId('health-filter-unknown').textContent).toContain('1');
  });

  it('calls onSearchChange when typing in search input', () => {
    const onSearchChange = vi.fn();
    render(<NodeSearchFilter {...defaultProps} onSearchChange={onSearchChange} />);

    fireEvent.change(screen.getByTestId('node-search-input'), {
      target: { value: 'gateway' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('gateway');
  });

  it('calls onHealthFilterChange when clicking a filter button', () => {
    const onHealthFilterChange = vi.fn();
    render(
      <NodeSearchFilter {...defaultProps} onHealthFilterChange={onHealthFilterChange} />
    );

    fireEvent.click(screen.getByTestId('health-filter-down'));
    expect(onHealthFilterChange).toHaveBeenCalledWith('down');
  });

  it('shows clear button when search has value', () => {
    render(<NodeSearchFilter {...defaultProps} searchQuery="test" />);
    expect(screen.getByTestId('node-search-clear')).toBeInTheDocument();
  });

  it('does not show clear button when search is empty', () => {
    render(<NodeSearchFilter {...defaultProps} searchQuery="" />);
    expect(screen.queryByTestId('node-search-clear')).not.toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    const onSearchChange = vi.fn();
    render(
      <NodeSearchFilter {...defaultProps} searchQuery="test" onSearchChange={onSearchChange} />
    );

    fireEvent.click(screen.getByTestId('node-search-clear'));
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('clears search on Escape key', () => {
    const onSearchChange = vi.fn();
    render(
      <NodeSearchFilter {...defaultProps} searchQuery="test" onSearchChange={onSearchChange} />
    );

    fireEvent.keyDown(screen.getByTestId('node-search-input'), { key: 'Escape' });
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('sets aria-pressed on active filter button', () => {
    render(<NodeSearchFilter {...defaultProps} healthFilter="down" />);

    expect(screen.getByTestId('health-filter-down').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('health-filter-all').getAttribute('aria-pressed')).toBe('false');
  });

  it('focuses search input when / is pressed globally', () => {
    render(<NodeSearchFilter {...defaultProps} />);

    const input = screen.getByTestId('node-search-input');
    expect(input).not.toHaveFocus();

    fireEvent.keyDown(document, { key: '/' });
    expect(input).toHaveFocus();
  });

  it('focuses search input on Ctrl+F shortcut', () => {
    render(<NodeSearchFilter {...defaultProps} />);

    const input = screen.getByTestId('node-search-input');
    expect(input).not.toHaveFocus();

    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    expect(input).toHaveFocus();
  });
});
