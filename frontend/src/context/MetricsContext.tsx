import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import type { DependencyGraph } from '../utils/dependencyGraph';
import { getNeighbors } from '../utils/dependencyGraph';
import { log } from '../config/appConfig';

const DEFAULT_INTERVAL_MS = 30000;
const PRIORITY_REFRESH_DEBOUNCE_MS = 2000;

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
  setDependencyGraph: (graph: DependencyGraph) => void;
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

/**
 * Collect all registered metric requests whose node is in the given set.
 */
export function getRequestsForNodes(
  requests: Map<string, MetricRequest>,
  nodeNames: Set<string>
): Map<string, MetricRequest> {
  const result = new Map<string, MetricRequest>();
  requests.forEach((req, key) => {
    if (nodeNames.has(req.node)) {
      result.set(key, req);
    }
  });
  return result;
}

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requestsRef = useRef<Map<string, MetricRequest>>(new Map());
  const intervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dependencyGraphRef = useRef<DependencyGraph | null>(null);
  const priorityRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPriorityNodesRef = useRef<Set<string>>(new Set());

  const safeFetchBatch = useCallback((requests: Map<string, MetricRequest>, source: string) => {
    void fetchBatch(requests).catch((error) => {
      log.debug(`[MetricsContext] ${source} batch error:`, error);
    });
  }, []);

  const triggerPriorityRefresh = useCallback(() => {
    const pendingNodes = pendingPriorityNodesRef.current;
    if (pendingNodes.size === 0) return;

    const neighborRequests = getRequestsForNodes(requestsRef.current, pendingNodes);

    if (neighborRequests.size > 0) {
      log.debug(
        '[MetricsContext] Priority refresh triggered for neighbors:',
        Array.from(pendingNodes),
        `(${neighborRequests.size} metrics)`
      );
      safeFetchBatch(neighborRequests, 'Priority refresh');
    }

    pendingPriorityNodesRef.current = new Set();
  }, [safeFetchBatch]);

  const schedulePriorityRefresh = useCallback((failedNodeName: string) => {
    const graph = dependencyGraphRef.current;
    if (!graph) return;

    const neighbors = getNeighbors(graph, failedNodeName);
    if (neighbors.size === 0) {
      log.debug('[MetricsContext] No neighbors for failed node:', failedNodeName);
      return;
    }

    log.debug(
      '[MetricsContext] Failure detected on node:',
      failedNodeName,
      '- scheduling priority refresh for:',
      Array.from(neighbors)
    );

    // Accumulate neighbor nodes for debounced batch
    neighbors.forEach(n => pendingPriorityNodesRef.current.add(n));

    // Debounce: reset timer so multiple near-simultaneous failures batch together
    if (priorityRefreshTimerRef.current) {
      clearTimeout(priorityRefreshTimerRef.current);
    }
    priorityRefreshTimerRef.current = setTimeout(triggerPriorityRefresh, PRIORITY_REFRESH_DEBOUNCE_MS);
  }, [triggerPriorityRefresh]);

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
            safeFetchBatch(groupRequests, 'Scheduled refresh');
          }
        }, intervalMs);
        intervalsRef.current.set(intervalMs, timerId);
      }
    });
  }, [safeFetchBatch]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(timerId => clearInterval(timerId));
      intervalsRef.current.clear();
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }
      if (priorityRefreshTimerRef.current) {
        clearTimeout(priorityRefreshTimerRef.current);
      }
    };
  }, []);

  // Initial fetch after short delay
  useEffect(() => {
    initialTimeoutRef.current = setTimeout(() => {
      if (requestsRef.current.size > 0) {
        safeFetchBatch(new Map(requestsRef.current), 'Initial refresh');
      }
    }, 1000);

    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }
    };
  }, [safeFetchBatch]);

  const registerMetric = useCallback((
    url: string,
    node: string,
    callback: (data: any) => void,
    errorCallback: (error: any) => void,
    intervalMs: number = DEFAULT_INTERVAL_MS
  ): (() => void) => {
    const key = `${node}-${url}`;

    // Wrap errorCallback to trigger priority refresh on failure
    const wrappedErrorCallback = (error: any) => {
      errorCallback(error);
      schedulePriorityRefresh(node);
    };

    // Registering the same key again intentionally replaces the previous callbacks.
    requestsRef.current.set(key, { url, node, key, intervalMs, callback, errorCallback: wrappedErrorCallback });
    syncIntervals();

    return () => {
      requestsRef.current.delete(key);
      syncIntervals();
    };
  }, [syncIntervals, schedulePriorityRefresh]);

  const setDependencyGraph = useCallback((graph: DependencyGraph) => {
    dependencyGraphRef.current = graph;
    log.debug(
      '[MetricsContext] Dependency graph set:',
      graph.neighbors.size,
      'nodes'
    );
  }, []);

  return (
    <MetricsContext.Provider value={{ registerMetric, setDependencyGraph }}>
      {children}
    </MetricsContext.Provider>
  );
};
