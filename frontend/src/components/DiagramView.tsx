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
import type { DiagramConfig, DiagramNode } from '../types/diagram';

const nodeTypes = {
  custom: CustomNode,
};

const DiagramView: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [config, setConfig] = useState<DiagramConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/diagram-config.json');
        const data: DiagramConfig = await response.json();
        setConfig(data);
        
        // Convert config nodes to React Flow nodes
        const flowNodes = data.nodes.map((node: DiagramNode, index: number) => ({
          id: node.name,
          type: 'custom',
          position: node.position || { 
            x: index * 300 + 100, 
            y: 200 
          },
          data: {
            ...node,
            config: data.config,
          },
        }));

        // Create edges from connections (right-to-left definition)
        const flowEdges: Edge[] = [];
        data.nodes.forEach((node: DiagramNode) => {
          node.connectTo.forEach((connection, index: number) => {
            // Handle both string and object connection formats
            const sourceId = typeof connection === 'string' ? connection : connection.target;
            const outputHandle = typeof connection === 'object' ? connection.outputHandle || 0 : index;
            const inputHandle = typeof connection === 'object' ? connection.inputHandle || 0 : 0;
            
            // Find the source node to get its properties
            const sourceNode = data.nodes.find(n => n.name === sourceId);
            if (sourceNode) {
              flowEdges.push({
                id: `${sourceId}-${node.name}-${index}`,
                source: sourceId,
                target: node.name,
                sourceHandle: `output-${outputHandle}`,
                targetHandle: `input-${inputHandle}`,
                type: 'smoothstep',
                animated: sourceNode.particles?.enabled || false,
                style: {
                  stroke: sourceNode.lineColor || '#3498db',
                  strokeWidth: 2,
                  strokeDasharray: sourceNode.lineType === 'dashed' ? '5,5' : undefined,
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
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
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