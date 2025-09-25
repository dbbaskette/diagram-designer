import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomCurvedEdge from './CustomEdge';
import ParticleEdge from './ParticleEdge';
import type { DiagramConfig, DiagramNode } from '../types/diagram';

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
}

const DiagramView: React.FC<DiagramViewProps> = ({ onConfigLoad, selectedDiagram = 'diagram-config.json', showCoordinates = false }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`/api/diagrams/${selectedDiagram}`);
        const data: DiagramConfig = await response.json();
        console.log(`🔍 Loaded diagram: ${selectedDiagram} at ${new Date().toISOString()}`);
        console.log(`🔍 Full telegen node:`, data.nodes.find(n => n.name === 'telegen'));
        console.log(`🔍 Sample node particles:`, data.nodes.find(n => n.name === 'telegen')?.particles);
        console.log(`🔍 All nodes with particles:`, data.nodes.filter(n => n.particles?.enabled).map(n => ({name: n.name, particles: n.particles})));
        setConfig(data);
        
        // Notify parent component that config is loaded
        if (onConfigLoad) {
          onConfigLoad(data);
        }
        
        // Load saved positions for this diagram
        const savedPositionsKey = `diagram-positions-${selectedDiagram}`;
        const savedPositions = JSON.parse(localStorage.getItem(savedPositionsKey) || '{}');
        
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
        setLoading(false);
      } catch (error) {
        console.error('Error loading diagram configuration:', error);
        setLoading(false);
      }
    };

    loadConfig();
  }, [selectedDiagram]);

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
    <div className="h-full bg-gray-900">
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
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
            }}
            zoomable
            pannable
          />
          <Controls
            style={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#374151"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default DiagramView;