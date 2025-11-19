import React, { createContext, useContext, useEffect, useRef } from 'react';

interface MetricRequest {
  url: string;
  node: string;
  key: string;
  callback: (data: any) => void;
  errorCallback: (error: any) => void;
}

interface MetricsContextType {
  registerMetric: (url: string, node: string, callback: (data: any) => void, errorCallback: (error: any) => void) => () => void;
}

const MetricsContext = createContext<MetricsContextType | null>(null);

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requestsRef = useRef<Map<string, MetricRequest>>(new Map());

  useEffect(() => {
    const fetchMetrics = async () => {
      const currentRequests = new Map(requestsRef.current);
      if (currentRequests.size === 0) return;

      const batchPayload = Array.from(currentRequests.values()).map(req => ({
        url: req.url,
        node: req.node,
        key: req.key
      }));

      try {
        const response = await fetch('/api/metrics/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchPayload)
        });

        if (response.ok) {
          const data = await response.json();

          // Distribute results
          currentRequests.forEach((req) => {
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
          // Handle batch failure
          currentRequests.forEach(req => req.errorCallback(`Batch request failed: ${response.status}`));
        }
      } catch (error) {
        currentRequests.forEach(req => req.errorCallback(error));
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    // Initial fetch after a short delay to allow components to mount and register
    const initialTimeout = setTimeout(fetchMetrics, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const registerMetric = (url: string, node: string, callback: (data: any) => void, errorCallback: (error: any) => void) => {
    const key = `${node}-${url}`;
    requestsRef.current.set(key, { url, node, key, callback, errorCallback });

    // Return unregister function
    return () => {
      requestsRef.current.delete(key);
    };
  };

  return (
    <MetricsContext.Provider value={{ registerMetric }}>
      {children}
    </MetricsContext.Provider>
  );
};
