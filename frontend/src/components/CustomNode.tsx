import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../types/diagram';

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  // Get handle configuration from node data
  const inputHandles = data.handles?.input || 1;
  const outputHandles = data.handles?.output || 1;
  
  // Status monitoring state
  const [status, setStatus] = useState<'up' | 'down' | 'unknown'>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Status checking function
  const checkStatus = async () => {
    if (!data.status) return;
    
    try {
      const response = await fetch(data.status.url, {
        headers: {
          'Authorization': `Bearer ${data.status.key}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const statusValue = result[data.status.valueField];
        
        if (statusValue === data.status.upValue) {
          setStatus('up');
        } else if (statusValue === data.status.downValue) {
          setStatus('down');
        } else {
          setStatus('unknown');
        }
      } else {
        setStatus('down');
      }
    } catch (error) {
      console.error(`Status check failed for ${data.name}:`, error);
      setStatus('down');
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
  
  // Generate input handles
  const inputHandleElements = [];
  console.log(`Creating ${inputHandles} input handles for ${data.name}`);
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
  console.log(`Creating ${outputHandles} output handles for ${data.name}`);
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
        className="diagram-node healthy"
        style={{
          borderColor: data.circleColor || '#22c55e',
          filter: data.config.nodeGlow?.enabled 
            ? `drop-shadow(0 0 ${data.config.nodeGlow.spread}px ${data.circleColor || '#22c55e'})` 
            : undefined
        }}
      >
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
          <div 
            className={`w-4 h-4 rounded-full border-2 border-gray-900 ${
              status === 'up' ? 'bg-green-500' : 
              status === 'down' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}
            title={`Status: ${status}${lastChecked ? ` (Last checked: ${lastChecked.toLocaleTimeString()})` : ''}`}
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