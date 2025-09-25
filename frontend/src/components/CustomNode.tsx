import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData, DataGridItem } from '../types/diagram';
import { buildMetricsUrl, log, appConfig } from '../config/appConfig';
import NodeDetailModal, { type NodeDetailConfig } from './NodeDetailModal';
import { nodeDetailsService } from '../services/nodeDetailsService';

// Utility function to get nested object values by path (e.g., "measurements[0].value")
const getNestedValue = (obj: any, path: string): any => {
  try {
    return path.split(/[.\[\]]/).filter(Boolean).reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  } catch (error) {
    log.warn(`Error accessing path "${path}":`, error);
    return undefined;
  }
};

// Component for individual metric rows
const MetricRow: React.FC<{ metric: DataGridItem; nodeName: string }> = ({ metric, nodeName }) => {
  const [value, setValue] = useState<string>('Loading...');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchMetric = async () => {
      try {
        const proxyUrl = buildMetricsUrl(metric.url, nodeName);
        log.debug(`Fetching metric for ${nodeName}:`, proxyUrl);

        const response = await fetch(proxyUrl);

        if (response.ok) {
          const data = await response.json();
          const metricValue = getNestedValue(data, metric.valueField);

          if (metricValue !== undefined && metricValue !== null) {
            // Format numbers nicely
            const formatted = typeof metricValue === 'number'
              ? metricValue.toLocaleString()
              : metricValue.toString();
            setValue(formatted);
            setError(false);
          } else {
            setValue('N/A');
            setError(true);
            log.warn(`Field '${metric.valueField}' not found in response for ${nodeName}`);
          }
        } else {
          setValue('N/A');
          setError(true);
          log.warn(`Metric fetch failed for ${nodeName}: ${response.status}`);
        }
      } catch (err) {
        if (appConfig.development.enableMockData) {
          // Show mock data in development
          const mockValue = Math.floor(Math.random() * 1000);
          setValue(mockValue.toLocaleString());
          setError(false);
        } else {
          setValue('N/A');
          setError(true);
        }
        log.error(`Metric fetch error for ${nodeName}:`, err);
      }
    };

    fetchMetric();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetric, 30000);
    return () => clearInterval(interval);
  }, [metric.url, metric.valueField, nodeName]);

  return (
    <div className="diagram-node-metric-row">
      <div className="diagram-node-metric-label">{metric.label}</div>
      <div className={`diagram-node-metric-value ${error ? 'text-gray-400' : ''}`}>
        {value}
      </div>
    </div>
  );
};

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, xPos, yPos }) => {
  // Get handle configuration from node data (allow 0 handles)
  const inputHandles = data.handles?.input !== undefined ? data.handles.input : 1;
  const outputHandles = data.handles?.output !== undefined ? data.handles.output : 1;
  
  // Status monitoring state
  const [status, setStatus] = useState<'up' | 'down' | 'unknown'>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Modal state for detailed view
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<NodeDetailConfig | undefined>(undefined);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Status checking function
  const checkStatus = async () => {
    if (!data.status) return;
    
    try {
      log.debug(`Checking status for ${data.name}:`, {
        url: data.status.url,
        valueField: data.status.valueField,
        upValue: data.status.upValue,
        downValue: data.status.downValue
      });

      // Use the metrics proxy for all requests
      const proxyUrl = buildMetricsUrl(data.status.url, data.name);
      log.debug(`Using proxy URL: ${proxyUrl}`);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      log.debug(`Response status: ${response.status} for ${data.name}`);

      if (response.ok) {
        const result = await response.json();
        log.debug(`Response data for ${data.name}:`, result);

        const statusValue = getNestedValue(result, data.status.valueField);
        log.debug(`Extracted status value: "${statusValue}" for ${data.name}`);

        if (statusValue === data.status.upValue) {
          setStatus('up');
          setStatusError(null);
        } else if (statusValue === data.status.downValue) {
          setStatus('down');
          setStatusError(null);
        } else {
          setStatus('unknown');
          setStatusError(`Unexpected value: ${statusValue}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        log.warn(`HTTP ${response.status} for ${data.name}:`, errorData);

        if (appConfig.development.enableMockData) {
          // Mock as UP for development
          setStatus('up');
          setStatusError('Mocked (dev mode)');
        } else {
          setStatus('unknown');
          setStatusError(`HTTP ${response.status}: ${errorData.error || 'Service error'}`);
        }
      }
    } catch (error) {
      log.error(`Status check failed for ${data.name}:`, error);

      if (appConfig.development.enableMockData) {
        // Mock as UP for development
        setStatus('up');
        setStatusError('Mocked (network error)');
      } else {
        setStatus('unknown');
        setStatusError(error instanceof Error ? error.message : 'Network error');
      }
    }
    
    setLastChecked(new Date());
  };
  
  // Set up status checking interval
  useEffect(() => {
    if (data.status) {
      // Initial check
      checkStatus();
      
      // Set up interval
      const interval = setInterval(checkStatus, data.status.updateInterval);
      
      return () => clearInterval(interval);
    }
  }, [data.status]);

  // Modal functionality
  const handleNodeClick = async (event: React.MouseEvent) => {
    // Check if click behavior is specified in config
    const clickBehavior = data.clickBehavior || 'modal'; // Default to modal

    if (clickBehavior === 'url' && data.url) {
      // Direct URL navigation
      window.open(data.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (clickBehavior === 'both') {
      // Check for modifier keys - Ctrl/Cmd + click = URL, regular click = modal
      if ((event.ctrlKey || event.metaKey) && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    // Default behavior or modal mode - open details modal
    await openDetailsModal();
  };

  const openDetailsModal = async () => {
    setIsModalOpen(true);

    if (!nodeDetails && !detailsLoading) {
      setDetailsLoading(true);
      try {
        const details = await nodeDetailsService.loadNodeDetails(data.name);
        setNodeDetails(details || undefined);
      } catch (error) {
        log.error(`Failed to load details for ${data.name}:`, error);
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const closeDetailsModal = () => {
    setIsModalOpen(false);
  };

  // Generate input handles
  const inputHandleElements = [];
  for (let i = 0; i < inputHandles; i++) {
    let topPosition = '50%'; // Default center position
    
    if (inputHandles > 1) {
      // Spread handles vertically when multiple
      const spacing = 30; // pixels between handles
      const totalHeight = (inputHandles - 1) * spacing;
      const startOffset = -totalHeight / 2;
      const currentOffset = startOffset + (i * spacing);
      topPosition = `calc(50% + ${currentOffset}px)`;
    }
    
    inputHandleElements.push(
      <Handle
        key={`input-${i}`}
        type="target"
        position={Position.Left}
        id={`input-${i}`}
        style={{
          background: '#4b5563',
          width: 12,
          height: 12,
          border: '2px solid #1f2937',
          top: topPosition,
          transform: 'translateY(-50%)',
        }}
      />
    );
  }
  
  // Generate output handles
  const outputHandleElements = [];
  for (let i = 0; i < outputHandles; i++) {
    let topPosition = '50%'; // Default center position
    
    if (outputHandles > 1) {
      // Spread handles vertically when multiple
      const spacing = 30; // pixels between handles
      const totalHeight = (outputHandles - 1) * spacing;
      const startOffset = -totalHeight / 2;
      const currentOffset = startOffset + (i * spacing);
      topPosition = `calc(50% + ${currentOffset}px)`;
    }
    
    outputHandleElements.push(
      <Handle
        key={`output-${i}`}
        type="source"
        position={Position.Right}
        id={`output-${i}`}
        style={{
          background: '#4b5563',
          width: 12,
          height: 12,
          border: '2px solid #1f2937',
          top: topPosition,
          transform: 'translateY(-50%)',
        }}
      />
    );
  }
  
  return (
    <>
      {/* Input Handles - Configurable number */}
      {inputHandleElements}

      {/* Main Node Circle */}
      <div 
        className={`diagram-node healthy ${data.url ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{
          borderColor: data.circleColor || '#22c55e',
          filter: data.config.nodeGlow?.enabled 
            ? `drop-shadow(0 0 ${data.config.nodeGlow.spread}px ${data.circleColor || '#22c55e'})` 
            : undefined
        }}
        onClick={handleNodeClick}
        title={data.url ? `Click to open: ${data.url}` : undefined}
      >
        {/* Node Icon - Only icon inside circle */}
        <div className="diagram-node-icon">
          {data.icon.startsWith('/') || data.icon.startsWith('http') ? (
            <img 
              src={data.icon} 
              alt={data.displayName}
              className="w-12 h-12 object-contain"
            />
          ) : data.icon.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u) ? (
            <span className="text-4xl">{data.icon}</span>
          ) : (
            <i className={data.icon}></i>
          )}
        </div>

        {/* Status Indicator */}
        <div className="absolute -top-2 -right-2">
          <div 
            className={`w-4 h-4 rounded-full border-2 border-gray-900 ${
              status === 'up' ? 'bg-green-500' : 
              status === 'down' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}
            title={`Status: ${status}${statusError ? ` (${statusError})` : ''}${lastChecked ? ` (Last checked: ${lastChecked.toLocaleTimeString()})` : ''}`}
          ></div>
        </div>
      </div>

      {/* Node Title and Description - Below circle */}
      <div className="diagram-node-info">
        <div className="diagram-node-title">{data.displayName}</div>
        <div className="diagram-node-description">{data.description}</div>
      </div>

      {/* Metrics Table with Grid Lines - Below info */}
      <div className="diagram-node-metrics-grid">
        {data.dataGrid.map((item, index) => (
          <MetricRow key={index} metric={item} nodeName={data.name} />
        ))}
      </div>

      {/* Output Handles - Configurable number */}
      {outputHandleElements}

      {/* Coordinates Display */}
      {data.showCoordinates && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
          {Math.round(xPos || 0)}, {Math.round(yPos || 0)}
        </div>
      )}

      {/* Node Detail Modal */}
      <NodeDetailModal
        isOpen={isModalOpen}
        onClose={closeDetailsModal}
        nodeData={data}
        nodeDetails={nodeDetails}
      />
    </>
  );
};

export default CustomNode;