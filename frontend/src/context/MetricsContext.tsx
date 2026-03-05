import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

const DEFAULT_INTERVAL_MS = 30000;

interface MetricRequest {
  url: string;
  node: string;
  key: string;
  intervalMs: number;
  callback: (data: any) => void;
  errorCallback: (error: any) => void;
}

interface MetricsContextType {
  registerMetric: (
    url: string,
    node: string,
    callback: (data: any) => void,
    errorCallback: (error: any) => void,
    intervalMs?: number
  ) => () => void;
}

const MetricsContext = createContext<MetricsContextType | null>(null);

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

async function fetchBatch(requests: Map<string, MetricRequest>): Promise<void> {
  if (requests.size === 0) return;

  const batchPayload = Array.from(requests.values()).map(req => ({
    url: req.url,
    node: req.node,
    key: req.key
  }));

  try {
    const response = await fetch('/api/metrics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload)
    });

    if (response.ok) {
      const data = await response.json();
      requests.forEach((req) => {
        if (data[req.key]) {
          if (data[req.key].error) {
            req.errorCallback(data[req.key].error);
          } else {
            req.callback(data[req.key]);
          }
        } else {
          req.errorCallback('No data in batch response');
        }
      });
    } else {
      requests.forEach(req => req.errorCallback(`Batch request failed: ${response.status}`));
    }
  } catch (error) {
    requests.forEach(req => req.errorCallback(error));
  }
}

export function buildIntervalGroups(requests: Map<string, MetricRequest>): Map<number, Map<string, MetricRequest>> {
  const groups = new Map<number, Map<string, MetricRequest>>();
  requests.forEach((req, key) => {
    const interval = req.intervalMs;
    if (!groups.has(interval)) {
      groups.set(interval, new Map());
    }
    groups.get(interval)!.set(key, req);
  });
  return groups;
}

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requestsRef = useRef<Map<string, MetricRequest>>(new Map());
  const intervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncIntervals = useCallback(() => {
    // Determine which interval durations are currently needed
    const groups = buildIntervalGroups(requestsRef.current);
    const neededIntervals = new Set(groups.keys());

    // Remove intervals no longer needed
    intervalsRef.current.forEach((timerId, intervalMs) => {
      if (!neededIntervals.has(intervalMs)) {
        clearInterval(timerId);
        intervalsRef.current.delete(intervalMs);
      }
    });

    // Add intervals for new groups
    neededIntervals.forEach(intervalMs => {
      if (!intervalsRef.current.has(intervalMs)) {
        const timerId = setInterval(() => {
          const currentGroups = buildIntervalGroups(requestsRef.current);
          const groupRequests = currentGroups.get(intervalMs);
          if (groupRequests && groupRequests.size > 0) {
            fetchBatch(groupRequests);
          }
        }, intervalMs);
        intervalsRef.current.set(intervalMs, timerId);
      }
    });
  }, []);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(timerId => clearInterval(timerId));
      intervalsRef.current.clear();
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }
    };
  }, []);

  // Initial fetch after short delay
  useEffect(() => {
    initialTimeoutRef.current = setTimeout(() => {
      if (requestsRef.current.size > 0) {
        fetchBatch(new Map(requestsRef.current));
      }
    }, 1000);

    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }
    };
  }, []);

  const registerMetric = useCallback((
    url: string,
    node: string,
    callback: (data: any) => void,
    errorCallback: (error: any) => void,
    intervalMs: number = DEFAULT_INTERVAL_MS
  ): (() => void) => {
    const key = `${node}-${url}`;
    requestsRef.current.set(key, { url, node, key, intervalMs, callback, errorCallback });
    syncIntervals();

    return () => {
      requestsRef.current.delete(key);
      syncIntervals();
    };
  }, [syncIntervals]);

  return (
    <MetricsContext.Provider value={{ registerMetric }}>
      {children}
    </MetricsContext.Provider>
  );
};
