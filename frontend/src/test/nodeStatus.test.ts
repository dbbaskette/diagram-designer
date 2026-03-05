import { describe, it, expect } from 'vitest';
import { getNodeStatusClass, statusToHealthCategory } from '../utils/nodeStatus';
import type { NodeStatus } from '../utils/nodeStatus';

describe('getNodeStatusClass', () => {
  it('returns green for up status', () => {
    expect(getNodeStatusClass('up')).toBe('bg-green-500');
  });

  it('returns red for down status', () => {
    expect(getNodeStatusClass('down')).toBe('bg-red-500');
  });

  it('returns yellow for unknown status', () => {
    expect(getNodeStatusClass('unknown')).toBe('bg-yellow-500');
  });

  it('returns yellow for unrecognized status (default case)', () => {
    expect(getNodeStatusClass('bogus' as NodeStatus)).toBe('bg-yellow-500');
  });
});

describe('statusToHealthCategory', () => {
  it('returns healthy for up status', () => {
    expect(statusToHealthCategory('up')).toBe('healthy');
  });

  it('returns down for down status', () => {
    expect(statusToHealthCategory('down')).toBe('down');
  });

  it('returns unknown for unknown status', () => {
    expect(statusToHealthCategory('unknown')).toBe('unknown');
  });

  it('returns unknown for unrecognized status (default case)', () => {
    expect(statusToHealthCategory('bogus' as NodeStatus)).toBe('unknown');
  });
});
