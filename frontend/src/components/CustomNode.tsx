import React, { useState, useEffect, useCallback, memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData, DataGridItem } from '../types/diagram';
import { buildMetricsUrl, log, appConfig } from '../config/appConfig';
import NodeDetailModal, { type NodeDetailConfig } from './NodeDetailModal';
import { nodeDetailsService } from '../services/nodeDetailsService';
import { useMetrics } from '../context/MetricsContext';
import { getNodeStatusClass } from '../utils/nodeStatus';
import type { NodeStatus } from '../utils/nodeStatus';
import { resolveInterval } from '../utils/interval';

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
const MetricRow: React.FC<{
  metric: DataGridItem;
  nodeName: string;
  nodeIntervalMs?: number;
  globalIntervalMs?: number;
}> = memo(({ metric, nodeName, nodeIntervalMs, globalIntervalMs }) => {
  const [value, setValue] = useState<string>('Loading...');
  const [error, setError] = useState<boolean>(false);
  const { registerMetric } = useMetrics();

  useEffect(() => {
    const proxyUrl = buildMetricsUrl(metric.url, nodeName);
    const resolvedIntervalMs = resolveInterval(
      metric.pollIntervalMs,
      nodeIntervalMs,
      globalIntervalMs,
      `metric ${nodeName}:${metric.label}`
    );

    const unregister = registerMetric(
      proxyUrl,
      nodeName,
      (data) => {
        try {
          const metricValue = getNestedValue(data, metric.valueField);
          if (metricValue !== undefined && metricValue !== null) {
            const formatted = typeof metricValue === 'number'
              ? metricValue.toLocaleString()
              : metricValue.toString();
            setValue(formatted);
            setError(false);
          } else {
            setValue('N/A');
            setError(true);
          }
        } catch {
          setValue('Err');
          setError(true);
        }
      },
      () => {
        if (appConfig.development.enableMockData) {
          const mockValue = Math.floor(Math.random() * 1000);
          setValue(mockValue.toLocaleString());
          setError(false);
        } else {
          setValue('N/A');
          setError(true);
        }
      },
      resolvedIntervalMs
    );

    return unregister;
  }, [
    metric.url,
    metric.valueField,
    metric.pollIntervalMs,
    metric.label,
    nodeName,
    nodeIntervalMs,
    globalIntervalMs,
    registerMetric,
  ]);

  return (
    <div className="diagram-node-metric-row">
      <div className="diagram-node-metric-label">{metric.label}</div>
      <div className={`diagram-node-metric-value ${error ? 'text-gray-400' : ''}`}>
        {value}
      </div>
    </div>
  );
});

const CustomNode: React.FC<NodeProps<NodeData>> = memo(({ data, xPos, yPos }) => {
  // Get handle configuration from node data (allow 0 handles)
  const inputHandles = data.handles?.input !== undefined ? data.handles.input : 1;
  const outputHandles = data.handles?.output !== undefined ? data.handles.output : 1;

  // Status monitoring state
  const [status, setStatus] = useState<NodeStatus>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Modal state for detailed view
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<NodeDetailConfig | undefined>(undefined);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // A status check is "stale" when the most recent check is older than 2x the
  // expected update interval — gives users a visible cue when the metrics pipe
  // dries up without crashing the UI.
  const expectedIntervalMs = data.status?.updateInterval || data.pollIntervalMs || data.config.updateInterval || 30000;
  const isStale = lastChecked
    ? Date.now() - lastChecked.getTime() > expectedIntervalMs * 2
    : false;
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!data.status) return;
    const id = setInterval(() => forceTick((n) => n + 1), Math.max(5000, expectedIntervalMs));
    return () => clearInterval(id);
  }, [data.status, expectedIntervalMs]);

  const { registerMetric } = useMetrics();

  // Report status changes to parent
  useEffect(() => {
    if (status === 'unknown' && !lastChecked) {
      return;
    }
    data.onStatusChange?.(data.name, status);
  }, [status, lastChecked, data.name, data.onStatusChange]);

  // Status checking using batch system
  useEffect(() => {
    if (!data.status) return;

    const proxyUrl = buildMetricsUrl(data.status.url, data.name);

    const statusIntervalMs = resolveInterval(
      data.status.updateInterval,
      data.pollIntervalMs,
      data.config.updateInterval,
      `status ${data.name}`
    );

    const unregister = registerMetric(
      proxyUrl,
      data.name,
      (result) => {
        setLastChecked(new Date());
        try {
          const statusValue = getNestedValue(result, data.status!.valueField);

          if (statusValue === data.status!.upValue) {
            setStatus('up');
            setStatusError(null);
          } else if (statusValue === data.status!.downValue) {
            setStatus('down');
            setStatusError(null);
          } else {
            setStatus('unknown');
            setStatusError(`Unexpected: ${statusValue}`);
          }
        } catch {
          setStatus('unknown');
          setStatusError('Parse error');
        }
      },
      () => {
        setLastChecked(new Date());
        if (appConfig.development.enableMockData) {
          setStatus('up');
          setStatusError('Mocked (dev)');
        } else {
          setStatus('unknown');
          setStatusError('Network error');
        }
      },
      statusIntervalMs
    );

    return unregister;
  }, [data.status, data.name, data.pollIntervalMs, data.config.updateInterval, registerMetric]);

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
        const result = await nodeDetailsService.loadNodeDetails(data.name);
        if (result.status === 'success') {
          setNodeDetails(result.config);
        } else if (result.status === 'error') {
          log.error(`Failed to load details for ${data.name}: ${result.error}`);
        } else {
          // notFound is intentionally ignored to allow fallback modal content
        }
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const closeDetailsModal = () => {
    setIsModalOpen(false);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  useEffect(() => {
    if (!contextMenuPosition) {
      return;
    }

    const handleOutsideClick = () => closeContextMenu();
    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [contextMenuPosition, closeContextMenu]);

  // Listen for "open this node" requests dispatched from keyboard navigation.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail;
      if (detail?.nodeId === data.name) {
        void openDetailsModal();
      }
    };
    window.addEventListener('diagram:open-node', handler);
    return () => window.removeEventListener('diagram:open-node', handler);
    // openDetailsModal closure captures the right state for this node
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name]);

  // Generate handles with vertical spreading when multiple
  const generateHandles = (count: number, type: 'target' | 'source', prefix: string, position: Position) => {
    const spacing = 30;
    return Array.from({ length: count }, (_, i) => {
      const topPosition = count > 1
        ? `calc(50% + ${-(count - 1) * spacing / 2 + i * spacing}px)`
        : '50%';

      return (
        <Handle
          key={`${prefix}-${i}`}
          type={type}
          position={position}
          id={`${prefix}-${i}`}
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
    });
  };

  const inputHandleElements = generateHandles(inputHandles, 'target', 'input', Position.Left);
  const outputHandleElements = generateHandles(outputHandles, 'source', 'output', Position.Right);

  return (
    <div
      style={{ opacity: data.dimmed ? 0.5 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Input Handles - Configurable number */}
      {inputHandleElements}

      {/* Hover Preview Popover */}
      {isHovered && (
        <div
          className="absolute z-30 -top-2 left-full ml-3 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 text-left pointer-events-none"
          data-testid="node-hover-preview"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getNodeStatusClass(status)}`}></div>
            <div className="font-semibold text-gray-900 dark:text-white truncate">{data.displayName}</div>
          </div>
          {data.description && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-3">{data.description}</div>
          )}
          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
            <div>Status: <span className="font-medium">{status}{isStale ? ' (stale)' : ''}</span></div>
            {lastChecked && (
              <div>Last check: {lastChecked.toLocaleTimeString()}</div>
            )}
            {data.url && (
              <div className="truncate">↗ {data.url}</div>
            )}
            {data.dataGrid?.length > 0 && (
              <div>{data.dataGrid.length} metric{data.dataGrid.length === 1 ? '' : 's'} tracked</div>
            )}
          </div>
        </div>
      )}

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
        onContextMenu={handleContextMenu}
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
        <div className="absolute -top-2 -right-2 flex flex-col items-end gap-1">
          <div
            className={`w-4 h-4 rounded-full border-2 border-gray-900 ${getNodeStatusClass(status)}`}
            title={`Status: ${status}${statusError ? ` (${statusError})` : ''}${lastChecked ? ` (Last checked: ${lastChecked.toLocaleTimeString()})` : ''}`}
          ></div>
          {isStale && (
            <div
              className="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-bold shadow"
              title={`Stale: last check was ${lastChecked!.toLocaleTimeString()}`}
              data-testid="stale-badge"
            >
              STALE
            </div>
          )}
        </div>

        {/* Pin Indicator */}
        {data.pinned && (
          <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-yellow-500 border-2 border-gray-900 text-gray-900 flex items-center justify-center text-xs">
            <span role="img" aria-label="Pinned node">📌</span>
          </div>
        )}
      </div>

      {contextMenuPosition && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-gray-100 hover:bg-gray-700"
            onClick={(event) => {
              event.stopPropagation();
              data.onTogglePin?.(data.name);
              closeContextMenu();
            }}
          >
            {data.pinned ? 'Unpin node' : 'Pin node'}
          </button>
        </div>
      )}

      {/* Node Title and Description - Below circle */}
      <div className="diagram-node-info">
        <div className="diagram-node-title">{data.displayName}</div>
        <div className="diagram-node-description">{data.description}</div>
      </div>

      {/* Metrics Table with Grid Lines - Below info */}
      <div className="diagram-node-metrics-grid">
        {data.dataGrid.map((item, index) => (
          <MetricRow
            key={index}
            metric={item}
            nodeName={data.name}
            nodeIntervalMs={data.pollIntervalMs}
            globalIntervalMs={data.config.updateInterval}
          />
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
    </div>
  );
});

export default CustomNode;
