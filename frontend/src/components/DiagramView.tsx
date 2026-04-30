import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Panel,
  useReactFlow,
  getRectOfNodes,
  getTransformForBounds,
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import SharedParticleEdgeDefs from './SharedParticleEdgeDefs';
import type { DiagramConfig, DiagramNode } from '../types/diagram';
import { useTheme } from '../context/ThemeContext';
import { useMetrics } from '../context/MetricsContext';
import { buildDependencyGraph } from '../utils/dependencyGraph';
import { applyDagreLayout } from '../utils/autoLayout';
import NodeSearchFilter from './NodeSearchFilter';
import type { HealthFilter } from './NodeSearchFilter';
import type { NodeStatus } from '../utils/nodeStatus';
import { getVisibleNodeIds, applyNodeVisibility, applyEdgeVisibility, countNodesByStatus } from '../utils/nodeFilter';
import { subscribeDiagramAction } from '../utils/diagramActions';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  curved: CustomEdge,
  particle: CustomEdge,
};

interface DiagramViewProps {
  onConfigLoad?: (config: DiagramConfig) => void;
  selectedDiagram?: string;
  showCoordinates?: boolean;
  initialConfig?: DiagramConfig | null;
}

const validHealthFilters: HealthFilter[] = ['all', 'up', 'down', 'unknown'];

const getInitialSearchQuery = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('search') ?? '';
};

const getInitialHealthFilter = (): HealthFilter => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('health');
  return validHealthFilters.includes(value as HealthFilter) ? (value as HealthFilter) : 'all';
};

const readStoredPinnedNodeIds = (diagramName: string): { pins: Set<string>; hasStoredValue: boolean } => {
  const keys = [`diagram-pins-${diagramName}`, `diagram-pinned-${diagramName}`];

  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (!saved) {
      continue;
    }

    try {
      const parsed = JSON.parse(saved);
      return {
        pins: Array.isArray(parsed) ? new Set(parsed) : new Set(),
        hasStoredValue: true,
      };
    } catch (error) {
      console.warn('Failed to parse pinned node IDs from localStorage:', error);
      return { pins: new Set(), hasStoredValue: true };
    }
  }

  return { pins: new Set(), hasStoredValue: false };
};

const readStoredPositions = (diagramName: string): Record<string, { x: number; y: number }> => {
  const key = `diagram-positions-${diagramName}`;
  const saved = localStorage.getItem(key);

  if (!saved) {
    return {};
  }

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, { x: number; y: number }>
      : {};
  } catch (error) {
    console.warn('Failed to parse node positions from localStorage:', error);
    return {};
  }
};

const buildFlowEdges = (data: DiagramConfig): Edge[] => {
  const flowEdges: Edge[] = [];

  data.nodes.forEach((node: DiagramNode) => {
    node.connectTo.forEach((connection, index: number) => {
      const sourceId = typeof connection === 'string' ? connection : connection.target;
      const outputHandle = typeof connection === 'object' ? connection.outputHandle || 0 : index;
      const inputHandle = typeof connection === 'object' ? connection.inputHandle || 0 : 0;

      const targetNode = data.nodes.find(n => n.name === sourceId);
      if (!targetNode) {
        return;
      }

      const connectionParticles = typeof connection === 'object' ? connection.particles : undefined;
      const particles = connectionParticles || node.particles;

      const connectionLineType = typeof connection === 'object' ? connection.lineType : undefined;
      const connectionLineColor = typeof connection === 'object' ? connection.lineColor : undefined;
      const connectionEdgeType = typeof connection === 'object' ? connection.edgeType : undefined;

      const lineType = connectionLineType || node.lineType;
      const lineColor = connectionLineColor || node.lineColor || '#3498db';
      const baseEdgeType = connectionEdgeType || node.edgeType || 'smoothstep';

      let edgeType = baseEdgeType;
      if (particles?.enabled) {
        edgeType = 'particle';
      }

      const edgeSource = particles?.direction === 'source' ? node.name : sourceId;
      const edgeTarget = particles?.direction === 'source' ? sourceId : node.name;

      flowEdges.push({
        id: `${edgeSource}-${edgeTarget}-${index}`,
        source: edgeSource,
        target: edgeTarget,
        sourceHandle: `output-${outputHandle}`,
        targetHandle: `input-${inputHandle}`,
        type: edgeType,
        animated: particles?.enabled || false,
        style: {
          stroke: lineColor,
          strokeWidth: 2,
          strokeDasharray: lineType === 'dashed' ? '5,5' : undefined,
        },
        pathOptions: {
          borderRadius: 20,
        },
        data: {
          particles: particles,
          originalEdgeType: baseEdgeType,
        },
      });
    });
  });

  return flowEdges;
};

// Inner component that uses ReactFlow hooks
const DiagramViewInner: React.FC<DiagramViewProps> = ({ onConfigLoad, selectedDiagram = 'diagram-config.json', showCoordinates = false, initialConfig = null }) => {
  const { theme } = useTheme();
  const reactFlowInstance = useReactFlow();
  const { getNodes } = reactFlowInstance;
  const { setDependencyGraph, refreshAll } = useMetrics();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinnedNodeIds, setPinnedNodeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>(getInitialHealthFilter);
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const dragPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memoizedFlowEdges = useMemo(() => {
    if (!config) {
      return [];
    }
    return buildFlowEdges(config);
  }, [config]);

  const persistNodePositions = useCallback((flowNodes: Pick<Node, 'id' | 'position'>[]) => {
    const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
    const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');

    flowNodes.forEach((node) => {
      currentPositions[node.id] = node.position;
    });

    localStorage.setItem(savedPositionsKey, JSON.stringify(currentPositions));
  }, [selectedDiagram]);

  const schedulePositionPersist = useCallback((flowNodes: Pick<Node, 'id' | 'position'>[]) => {
    const snapshot = flowNodes.map((node) => ({ id: node.id, position: node.position }));

    if (dragPersistTimeoutRef.current) {
      clearTimeout(dragPersistTimeoutRef.current);
    }

    dragPersistTimeoutRef.current = setTimeout(() => {
      persistNodePositions(snapshot);
      dragPersistTimeoutRef.current = null;
    }, 300);
  }, [persistNodePositions]);

  useEffect(() => {
    return () => {
      if (dragPersistTimeoutRef.current) {
        clearTimeout(dragPersistTimeoutRef.current);
      }
    };
  }, []);

  const handleNodeStatusChange = useCallback((nodeId: string, status: NodeStatus) => {
    setNodeStatuses((prev) => {
      if (prev.get(nodeId) === status) return prev;
      const next = new Map(prev);
      next.set(nodeId, status);
      return next;
    });
  }, []);

  // Load pinned node IDs from localStorage
  useEffect(() => {
    setPinnedNodeIds(readStoredPinnedNodeIds(selectedDiagram).pins);
  }, [selectedDiagram]);

  const togglePinNode = useCallback((nodeId: string) => {
    setPinnedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      const pinnedKey = `diagram-pins-${selectedDiagram}`;
      localStorage.setItem(pinnedKey, JSON.stringify([...next]));
      return next;
    });
  }, [selectedDiagram]);

  // Build flow nodes from config — extracted so reset-layout can call it directly
  const processConfig = useCallback((data: DiagramConfig, skipSavedPositions: boolean = false) => {
    const savedPositions = skipSavedPositions ? {} : readStoredPositions(selectedDiagram);
    const defaultPinned = new Set(
      data.nodes.filter((node) => node.pinned).map((node) => node.name)
    );
    const storedPinned = readStoredPinnedNodeIds(selectedDiagram);
    const pinnedForBuild = storedPinned.hasStoredValue ? storedPinned.pins : defaultPinned;

    if (!storedPinned.hasStoredValue && defaultPinned.size > 0) {
      localStorage.setItem(`diagram-pins-${selectedDiagram}`, JSON.stringify([...defaultPinned]));
    }

    setPinnedNodeIds(pinnedForBuild);

    const flowNodes = data.nodes.map((node: DiagramNode, index: number) => {
      const savedPosition = savedPositions[node.name];
      const configPosition = node.position;
      const defaultPosition = { x: index * 300 + 100, y: 200 };

      return {
        id: node.name,
        type: 'custom',
        position: savedPosition || configPosition || defaultPosition,
        data: {
          ...node,
          config: data.config,
          showCoordinates,
          dimmed: false,
          pinned: pinnedForBuild.has(node.name),
          onTogglePin: togglePinNode,
          onStatusChange: handleNodeStatusChange,
        },
      };
    });

    setNodes(flowNodes);
    setDependencyGraph(buildDependencyGraph(data.nodes));
  }, [selectedDiagram, showCoordinates, togglePinNode, handleNodeStatusChange, setNodes, setDependencyGraph]);

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      // Check for pending template in localStorage first
      const pendingTemplateStr = localStorage.getItem('pendingTemplate');
      if (pendingTemplateStr) {
        try {
          const pendingTemplate = JSON.parse(pendingTemplateStr);
          localStorage.removeItem('pendingTemplate');

          setConfig(pendingTemplate.config);
          if (onConfigLoad) {
            onConfigLoad(pendingTemplate.config);
          }

          // Don't load saved positions for templates (skipSavedPositions = true)
          processConfig(pendingTemplate.config, true);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error loading pending template:', error);
          localStorage.removeItem('pendingTemplate');
        }
      }

      // If initialConfig is provided, use it directly
      if (initialConfig) {
        setConfig(initialConfig);

        // Notify parent component that config is loaded
        if (onConfigLoad) {
          onConfigLoad(initialConfig);
        }

        processConfig(initialConfig, true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/diagrams/${selectedDiagram}`);
        const data: DiagramConfig = await response.json();
        setConfig(data);

        // Notify parent component that config is loaded
        if (onConfigLoad) {
          onConfigLoad(data);
        }

        processConfig(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading diagram configuration:', error);
        setLoading(false);
      }
    };

    loadConfig();
    // processConfig intentionally not in deps: it captures the diagram name
    // and we only want to reload when the source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiagram, initialConfig]);

  useEffect(() => {
    setEdges(memoizedFlowEdges);
  }, [memoizedFlowEdges, setEdges]);

  // Inject the source node's live health status onto each edge so CustomEdge
  // can color the stroke red/yellow/green at a glance.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceStatus = nodeStatuses.get(edge.source) ?? 'unknown';
        if (edge.data?.sourceStatus === sourceStatus) return edge;
        return { ...edge, data: { ...edge.data, sourceStatus } };
      })
    );
  }, [nodeStatuses, setEdges]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }

    if (healthFilter !== 'all') {
      params.set('health', healthFilter);
    } else {
      params.delete('health');
    }

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [searchQuery, healthFilter]);

  // Update node data when pinnedNodeIds changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          pinned: pinnedNodeIds.has(node.id),
          onTogglePin: togglePinNode,
          onStatusChange: handleNodeStatusChange,
        },
      }))
    );
  }, [pinnedNodeIds, setNodes, togglePinNode, handleNodeStatusChange]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          showCoordinates,
        },
      }))
    );
  }, [showCoordinates, setNodes]);

  const handleAutoLayout = useCallback(() => {
    const direction = config?.config.layout === 'vertical' ? 'TB' : 'LR';
    const laid = applyDagreLayout(nodes, edges, pinnedNodeIds, { direction });
    setNodes(laid);

    // Persist the new positions
    const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
    const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');
    laid.forEach((node) => {
      currentPositions[node.id] = node.position;
    });
    localStorage.setItem(savedPositionsKey, JSON.stringify(currentPositions));
  }, [nodes, edges, pinnedNodeIds, config, selectedDiagram, setNodes]);

  // Reset layout: discard saved positions and rebuild from the config's defaults.
  const handleResetLayout = useCallback(() => {
    if (!config) return;
    localStorage.removeItem(`diagram-positions-${selectedDiagram}`);
    processConfig(config, true);
    requestAnimationFrame(() => {
      try { reactFlowInstance.fitView({ duration: 250, padding: 0.2 }); } catch { /* noop in tests */ }
    });
  }, [config, selectedDiagram, processConfig, reactFlowInstance]);

  const handleFitView = useCallback(() => {
    try { reactFlowInstance.fitView({ duration: 250, padding: 0.2 }); } catch { /* noop */ }
  }, [reactFlowInstance]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handle node position changes and save to localStorage
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleNodeDragStop = useCallback(() => {
    const latestNodes = getNodes().map((node) => ({ id: node.id, position: node.position }));
    schedulePositionPersist(latestNodes);
  }, [getNodes, schedulePositionPersist]);

  const downloadImage = useCallback(() => {
    const nodesBounds = getRectOfNodes(getNodes());
    const imageWidth = 2048;
    const imageHeight = 1536;
    const backgroundColor = theme === 'dark' ? '#111827' : '#ffffff';

    // Add padding around the nodes
    const padding = 100;
    const transform = getTransformForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5, // min zoom
      2, // max zoom
      padding
    );

    // Find the React Flow viewport element
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (!viewport) {
      console.error('Could not find React Flow viewport');
      return;
    }

    // Temporarily apply the transform for the screenshot
    const originalTransform = viewport.style.transform;
    viewport.style.transform = `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`;

    toPng(viewport, {
      backgroundColor,
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
      },
    })
      .then((dataUrl) => {
        // Restore original transform
        viewport.style.transform = originalTransform;

        const a = document.createElement('a');
        a.setAttribute('download', `${selectedDiagram.replace('.json', '')}.png`);
        a.setAttribute('href', dataUrl);
        a.click();
      })
      .catch((error) => {
        console.error('Error generating image:', error);
        // Restore original transform on error too
        viewport.style.transform = originalTransform;
      });
  }, [getNodes, theme, selectedDiagram]);

  // Compute node counts and filtered nodes/edges
  const nodeCounts = useMemo(
    () => countNodesByStatus(nodes, nodeStatuses),
    [nodes, nodeStatuses]
  );

  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(nodes, searchQuery, healthFilter, nodeStatuses),
    [nodes, searchQuery, healthFilter, nodeStatuses]
  );

  const isFiltering = searchQuery !== '' || healthFilter !== 'all';

  const decoratedNodes = useMemo(
    () => nodes.map((node) =>
      node.id === selectedNodeId
        ? { ...node, data: { ...node.data, kbSelected: true }, className: 'kb-selected' }
        : (node.data?.kbSelected ? { ...node, data: { ...node.data, kbSelected: false }, className: '' } : node)
    ),
    [nodes, selectedNodeId]
  );

  const filteredNodes = useMemo(
    () => (isFiltering ? applyNodeVisibility(decoratedNodes, visibleNodeIds) : decoratedNodes),
    [decoratedNodes, visibleNodeIds, isFiltering]
  );

  const filteredEdges = useMemo(
    () => (isFiltering ? applyEdgeVisibility(edges, visibleNodeIds) : edges),
    [edges, visibleNodeIds, isFiltering]
  );

  // Cycle keyboard selection through visible nodes ordered left-to-right, top-to-bottom.
  const cycleSelection = useCallback((direction: 1 | -1) => {
    const candidates = (isFiltering ? nodes.filter((n) => visibleNodeIds.has(n.id)) : nodes)
      .slice()
      .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x));
    if (candidates.length === 0) return;
    const currentIdx = selectedNodeId ? candidates.findIndex((n) => n.id === selectedNodeId) : -1;
    const nextIdx = currentIdx === -1
      ? (direction === 1 ? 0 : candidates.length - 1)
      : (currentIdx + direction + candidates.length) % candidates.length;
    const next = candidates[nextIdx];
    setSelectedNodeId(next.id);
    try {
      reactFlowInstance.setCenter(
        next.position.x + 110,
        next.position.y + 130,
        { zoom: 1.4, duration: 200 }
      );
    } catch { /* noop in tests */ }
  }, [nodes, visibleNodeIds, isFiltering, selectedNodeId, reactFlowInstance]);

  const openSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    window.dispatchEvent(new CustomEvent('diagram:open-node', { detail: { nodeId: selectedNodeId } }));
  }, [selectedNodeId]);

  // Subscribe to commands dispatched from the command palette / sticky toolbar.
  useEffect(() => {
    return subscribeDiagramAction((action) => {
      switch (action) {
        case 'auto-layout': handleAutoLayout(); break;
        case 'reset-layout': handleResetLayout(); break;
        case 'fit-view': handleFitView(); break;
        case 'refresh-metrics': refreshAll(); break;
        case 'export-image': downloadImage(); break;
        case 'focus-next': cycleSelection(1); break;
        case 'focus-prev': cycleSelection(-1); break;
        case 'open-selected': openSelectedNode(); break;
      }
    });
  }, [handleAutoLayout, handleResetLayout, handleFitView, refreshAll, downloadImage, cycleSelection, openSelectedNode]);

  // Global keyboard navigation. Skip when a text input has focus.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        cycleSelection(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        cycleSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openSelectedNode();
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleSelection, openSelectedNode]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading diagram configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="card text-center">
          <i className="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
          <h3 className="text-xl font-semibold text-white mb-2">Configuration Error</h3>
          <p className="text-gray-400">Failed to load diagram configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <SharedParticleEdgeDefs />
      {/* React Flow Diagram - Full Height */}
      <div className="h-full">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={handleNodesChange}
          onNodeDragStop={handleNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <MiniMap
            style={{
              height: 120,
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            }}
            zoomable
            pannable
          />
          <Controls
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={theme === 'dark' ? '#374151' : '#e5e7eb'}
          />
          <Panel position="top-left">
            <NodeSearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              healthFilter={healthFilter}
              onHealthFilterChange={setHealthFilter}
              nodeCounts={nodeCounts}
            />
            {isFiltering && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Showing {visibleNodeIds.size} of {nodes.length} nodes
              </div>
            )}
          </Panel>
          <Panel position="top-right">
            <div className="flex gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-1">
              <button
                onClick={handleAutoLayout}
                title="Auto-arrange unpinned nodes (Dagre layout)"
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                data-testid="toolbar-auto-arrange"
              >
                <i className="fas fa-sitemap"></i>
              </button>
              <button
                onClick={handleResetLayout}
                title="Reset to original layout"
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                data-testid="toolbar-reset"
              >
                <i className="fas fa-undo"></i>
              </button>
              <button
                onClick={handleFitView}
                title="Fit to screen"
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                data-testid="toolbar-fit"
              >
                <i className="fas fa-expand"></i>
              </button>
              <button
                onClick={refreshAll}
                title="Refresh metrics now"
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                data-testid="toolbar-refresh"
              >
                <i className="fas fa-sync"></i>
              </button>
              <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
              <button
                onClick={downloadImage}
                title="Export as PNG"
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                data-testid="toolbar-export"
              >
                <i className="fas fa-download"></i>
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrapper component that provides ReactFlowProvider
const DiagramView: React.FC<DiagramViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DiagramViewInner {...props} />
    </ReactFlowProvider>
  );
};

export default React.memo(DiagramView);
