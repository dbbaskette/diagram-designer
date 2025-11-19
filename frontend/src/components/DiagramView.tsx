import React, { useState, useEffect, useCallback } from 'react';
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
import type { Connection, Edge } from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomCurvedEdge from './CustomEdge';
import ParticleEdge from './ParticleEdge';
import type { DiagramConfig, DiagramNode } from '../types/diagram';
import { useTheme } from '../context/ThemeContext';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  curved: CustomCurvedEdge,
  particle: ParticleEdge,
};

interface DiagramViewProps {
  onConfigLoad?: (config: DiagramConfig) => void;
  selectedDiagram?: string;
  showCoordinates?: boolean;
  initialConfig?: DiagramConfig | null;
}

// Inner component that uses ReactFlow hooks
const DiagramViewInner: React.FC<DiagramViewProps> = ({ onConfigLoad, selectedDiagram = 'diagram-config.json', showCoordinates = false, initialConfig = null }) => {
  const { theme } = useTheme();
  const { getNodes } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Load configuration
  useEffect(() => {
    const processConfig = (data: DiagramConfig, skipSavedPositions: boolean = false) => {
      // Load saved positions for this diagram (unless we're loading a template)
      const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
      const savedPositions = skipSavedPositions ? {} : JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');

      // Convert config nodes to React Flow nodes
      const flowNodes = data.nodes.map((node: DiagramNode, index: number) => {
        // Use saved position if available, otherwise use config position or default
        const savedPosition = savedPositions[node.name];
        const configPosition = node.position;
        const defaultPosition = {
          x: index * 300 + 100,
          y: 200
        };

        return {
          id: node.name,
          type: 'custom',
          position: savedPosition || configPosition || defaultPosition,
          data: {
            ...node,
            config: data.config,
            showCoordinates: showCoordinates,
          },
        };
      });

      // Create edges from connections (right-to-left definition)
      const flowEdges: Edge[] = [];
      data.nodes.forEach((node: DiagramNode) => {
        node.connectTo.forEach((connection, index: number) => {
          // Handle both string and object connection formats
          const sourceId = typeof connection === 'string' ? connection : connection.target;
          const outputHandle = typeof connection === 'object' ? connection.outputHandle || 0 : index;
          const inputHandle = typeof connection === 'object' ? connection.inputHandle || 0 : 0;

          // Find the target node to get its properties
          const targetNode = data.nodes.find(n => n.name === sourceId);
          if (targetNode) {
            // Check for connection-specific particle configuration first, then fall back to node-level
            const connectionParticles = typeof connection === 'object' ? connection.particles : undefined;
            const particles = connectionParticles || node.particles;

            // Debug logging - only for nodes with particles
            if (particles?.enabled) {
              console.log(`🔥 Edge: ${node.name} -> ${sourceId}`);
              console.log(`🔥 Particle config:`, {
                enabled: particles.enabled,
                text: particles.text,
                textColor: particles.textColor,
                fontSize: particles.fontSize,
                color: particles.color
              });
            }

            // Get connection-specific styling or fall back to node-level
            const connectionLineType = typeof connection === 'object' ? connection.lineType : undefined;
            const connectionLineColor = typeof connection === 'object' ? connection.lineColor : undefined;
            const connectionEdgeType = typeof connection === 'object' ? connection.edgeType : undefined;

            const lineType = connectionLineType || node.lineType;
            const lineColor = connectionLineColor || node.lineColor || '#3498db';
            const baseEdgeType = connectionEdgeType || node.edgeType || 'smoothstep';

            // Determine edge type based on particles and edgeType
            let edgeType = baseEdgeType;
            if (particles?.enabled) {
              edgeType = 'particle';
            }

            // Create edge based on direction
            // If direction is "source", edge goes from current node to target
            // If direction is "target", edge goes from target to current node
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
          }
        });
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    const loadConfig = async () => {
      // Check for pending template in localStorage first
      const pendingTemplateStr = localStorage.getItem('pendingTemplate');
      if (pendingTemplateStr) {
        try {
          const pendingTemplate = JSON.parse(pendingTemplateStr);
          console.log('🔍 Loading pending template:', pendingTemplate.name);
          localStorage.removeItem('pendingTemplate'); // Clear it so it doesn't load again

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
        console.log('🔍 Loading initial config (template/memory)');
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
        console.log(`🔍 Loaded diagram: ${selectedDiagram} at ${new Date().toISOString()}`);
        console.log(`🔍 Full telegen node:`, data.nodes.find(n => n.name === 'telegen'));
        console.log(`🔍 Sample node particles:`, data.nodes.find(n => n.name === 'telegen')?.particles);
        console.log(`🔍 All nodes with particles:`, data.nodes.filter(n => n.particles?.enabled).map(n => ({ name: n.name, particles: n.particles })));
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
  }, [selectedDiagram, initialConfig]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handle node position changes and save to localStorage
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);

    // Save positions when nodes are moved
    const positionChanges = changes.filter(change => change.type === 'position' && change.position);
    if (positionChanges.length > 0) {
      const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
      const currentPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');

      positionChanges.forEach(change => {
        currentPositions[change.id] = change.position;
      });

      localStorage.setItem(savedPositionsKey, JSON.stringify(currentPositions));
      console.log(`Saved positions for ${selectedDiagram}:`, currentPositions);
    }
  }, [onNodesChange, selectedDiagram]);

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
      {/* React Flow Diagram - Full Height */}
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
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
          <Panel position="top-right">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2 transition-colors"
              onClick={downloadImage}
            >
              <i className="fas fa-download"></i>
              Export Image
            </button>
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