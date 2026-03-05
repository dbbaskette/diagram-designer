import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveInterval, DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS } from '../utils/interval';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveInterval', () => {
  it('prefers metric-level interval when valid', () => {
    expect(resolveInterval(5000, 15000, 30000)).toBe(5000);
  });

  it('falls back from metric to node to global to default', () => {
    expect(resolveInterval(undefined, 15000, 30000)).toBe(15000);
    expect(resolveInterval(undefined, undefined, 45000)).toBe(45000);
    expect(resolveInterval(undefined, undefined, undefined)).toBe(DEFAULT_INTERVAL_MS);
  });

  it('ignores invalid non-positive intervals during fallback', () => {
    expect(resolveInterval(0, 7000, 30000)).toBe(7000);
    expect(resolveInterval(-1, undefined, 12000)).toBe(12000);
  });

  it('clamps values below minimum and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const resolved = resolveInterval(500, undefined, undefined, 'test-source');

    expect(resolved).toBe(MIN_INTERVAL_MS);
    expect(warnSpy).toHaveBeenCalled();
  });
});
