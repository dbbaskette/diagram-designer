import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../types/diagram';

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  // Get handle configuration from node data
  const inputHandles = data.handles?.input || 1;
  const outputHandles = data.handles?.output || 1;
  
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
          width: 8,
          height: 8,
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
          width: 8,
          height: 8,
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
      <div className="diagram-node healthy">
        {/* Node Icon - Only icon inside circle */}
        <div className="diagram-node-icon">
          {data.icon.startsWith('/') || data.icon.startsWith('http') ? (
            <img 
              src={data.icon} 
              alt={data.displayName}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <i className={data.icon}></i>
          )}
        </div>

        {/* Status Indicator */}
        <div className="absolute -top-2 -right-2">
          <div className="w-4 h-4 rounded-full border-2 border-gray-900 bg-green-500"></div>
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
          <div key={index} className="diagram-node-metric-row">
            <div className="diagram-node-metric-label">{item.label}</div>
            <div className="diagram-node-metric-value">
              {Math.floor(Math.random() * 1000).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Output Handles - Configurable number */}
      {outputHandleElements}
    </>
  );
};

export default CustomNode;