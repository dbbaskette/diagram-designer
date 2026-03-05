import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MetricsProvider, useMetrics, buildIntervalGroups } from '../context/MetricsContext';

// --- Unit tests for buildIntervalGroups ---

function makeRequest(key: string, intervalMs: number) {
  return {
    url: `http://example.com/${key}`,
    node: 'node-a',
    key,
    intervalMs,
    callback: vi.fn(),
    errorCallback: vi.fn(),
  };
}

describe('buildIntervalGroups', () => {
  it('groups requests by intervalMs', () => {
    const requests = new Map([
      ['a', makeRequest('a', 5000)],
      ['b', makeRequest('b', 30000)],
      ['c', makeRequest('c', 5000)],
    ]);

    const groups = buildIntervalGroups(requests);

    expect(groups.size).toBe(2);
    expect(groups.get(5000)!.size).toBe(2);
    expect(groups.get(30000)!.size).toBe(1);
    expect(groups.get(5000)!.has('a')).toBe(true);
    expect(groups.get(5000)!.has('c')).toBe(true);
    expect(groups.get(30000)!.has('b')).toBe(true);
  });

  it('returns empty map for empty input', () => {
    const groups = buildIntervalGroups(new Map());
    expect(groups.size).toBe(0);
  });

  it('single interval puts all in one group', () => {
    const requests = new Map([
      ['a', makeRequest('a', 10000)],
      ['b', makeRequest('b', 10000)],
    ]);

    const groups = buildIntervalGroups(requests);
    expect(groups.size).toBe(1);
    expect(groups.get(10000)!.size).toBe(2);
  });
});

// --- Integration tests for MetricsProvider ---

describe('MetricsProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MetricsProvider>{children}</MetricsProvider>
  );

  it('registerMetric returns an unregister function', () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    const unregister = result.current.registerMetric(
      'http://example.com/metric',
      'node-a',
      vi.fn(),
      vi.fn()
    );

    expect(typeof unregister).toBe('function');
  });

  it('defaults to 30s interval when none specified', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useMetrics(), { wrapper });

    const mockResponse = { 'node-a-http://example.com/m': { value: 42 } };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    act(() => {
      result.current.registerMetric(
        'http://example.com/m',
        'node-a',
        callback,
        vi.fn()
      );
    });

    // Initial fetch at 1s
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    // No fetch at 5s
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    // Fetch at 30s (1s initial delay + 30s interval = 31s total)
    await act(async () => {
      vi.advanceTimersByTime(26000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('respects custom polling interval', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useMetrics(), { wrapper });

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    act(() => {
      result.current.registerMetric(
        'http://example.com/fast',
        'node-a',
        callback,
        vi.fn(),
        5000
      );
    });

    // Initial fetch at 1s
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    // Next fetch at 5s interval (6s total)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    // Another at 11s total
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('batches metrics with same interval into single request', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    act(() => {
      result.current.registerMetric('http://example.com/a', 'node-a', vi.fn(), vi.fn(), 5000);
      result.current.registerMetric('http://example.com/b', 'node-b', vi.fn(), vi.fn(), 5000);
    });

    // Initial fetch batches both
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body).toHaveLength(2);
  });

  it('uses separate intervals for different groups', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    act(() => {
      result.current.registerMetric('http://example.com/fast', 'node-a', vi.fn(), vi.fn(), 5000);
      result.current.registerMetric('http://example.com/slow', 'node-b', vi.fn(), vi.fn(), 15000);
    });

    // Initial fetch includes both
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    // At 6s: 5000ms interval fires (just the fast metric group)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((fetch as any).mock.calls[1][1].body);
    expect(secondBody).toHaveLength(1);
    expect(secondBody[0].url).toBe('http://example.com/fast');

    // At 11s: another 5000ms tick
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(3);

    // At 16s: both 5000ms and 15000ms fire
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('cleans up interval when all metrics in group unregister', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    let unregister: () => void;
    act(() => {
      unregister = result.current.registerMetric(
        'http://example.com/m',
        'node-a',
        vi.fn(),
        vi.fn(),
        5000
      );
    });

    // Initial fetch
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    // Unregister
    act(() => {
      unregister();
    });

    // Advance past where next tick would fire - no more fetches
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('distributes batch results to correct callbacks', async () => {
    const callbackA = vi.fn();
    const callbackB = vi.fn();
    const { result } = renderHook(() => useMetrics(), { wrapper });

    const mockResponse = {
      'node-a-http://example.com/a': { value: 'resultA' },
      'node-b-http://example.com/b': { value: 'resultB' },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    act(() => {
      result.current.registerMetric('http://example.com/a', 'node-a', callbackA, vi.fn());
      result.current.registerMetric('http://example.com/b', 'node-b', callbackB, vi.fn());
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(callbackA).toHaveBeenCalledWith({ value: 'resultA' });
    expect(callbackB).toHaveBeenCalledWith({ value: 'resultB' });
  });

  it('calls errorCallback on batch failure', async () => {
    const errorCb = vi.fn();
    const { result } = renderHook(() => useMetrics(), { wrapper });

    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 500 })
    );

    act(() => {
      result.current.registerMetric('http://example.com/m', 'node-a', vi.fn(), errorCb);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(errorCb).toHaveBeenCalledWith('Batch request failed: 500');
  });
});
