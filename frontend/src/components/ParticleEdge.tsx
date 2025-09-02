import React, { useRef } from 'react';

interface ParticleEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: any;
  data?: any;
  markerEnd?: string;
}

const ParticleEdge: React.FC<ParticleEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  
  // Get particle configuration from data
  const particles = data?.particles || { enabled: false };
  const originalEdgeType = data?.originalEdgeType || 'smoothstep';

  // Create a smooth curved path
  const createCurvedPath = () => {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Calculate control points for a smooth curve
    const controlPoint1X = sourceX + (midX - sourceX) * 0.5;
    const controlPoint1Y = sourceY;
    const controlPoint2X = targetX - (targetX - midX) * 0.5;
    const controlPoint2Y = targetY;
    
    return `M ${sourceX} ${sourceY} Q ${controlPoint1X} ${controlPoint1Y} ${midX} ${midY} Q ${controlPoint2X} ${controlPoint2Y} ${targetX} ${targetY}`;
  };

  const createReversedPath = () => {
    // Create a curved path from target to source (reversed direction)
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Calculate control points for a smooth curve (reversed)
    const controlPoint1X = targetX - (targetX - midX) * 0.5;
    const controlPoint1Y = targetY;
    const controlPoint2X = sourceX + (midX - sourceX) * 0.5;
    const controlPoint2Y = sourceY;
    
    return `M ${targetX} ${targetY} Q ${controlPoint1X} ${controlPoint1Y} ${midX} ${midY} Q ${controlPoint2X} ${controlPoint2Y} ${sourceX} ${sourceY}`;
  };

  // Create particles along the path
  const createParticles = () => {
    if (!particles.enabled) return [];

    const particleCount = particles.count || 5;
    const particleElements = [];
    
    // Create path based on direction
    // If direction is "source", particles flow from source to target (normal direction)
    // If direction is "target", particles flow from target to source (reversed direction)
    const isSource = particles.direction === 'source';
    const pathData = isSource ? createCurvedPath() : createReversedPath();
    
    // Debug logging
    console.log(`Particle direction: ${particles.direction}, isSource: ${isSource}, pathData: ${pathData}`);

    for (let i = 0; i < particleCount; i++) {
      const delay = (i / particleCount) * 1.5; // Stagger particles
      const size = 3 + Math.random() * 2; // Random size between 3-5
      
      particleElements.push(
        <circle
          key={`particle-${i}`}
          r={size}
          fill={particles.color || '#3498db'}
          opacity={0.9}
          filter="url(#particle-glow)"
        >
          <animateMotion
            dur={`${(particles.speed || 5) > 0 ? (11 - (particles.speed || 5)) / 3 : 1.5}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            path={pathData}
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            dur={`${(particles.speed || 5) > 0 ? (11 - (particles.speed || 5)) / 3 : 1.5}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
          />
          <animate
            attributeName="r"
            values={`${size};${size * 1.5};${size}`}
            dur="1.5s"
            repeatCount="indefinite"
            begin={`${delay}s`}
          />
        </circle>
      );
    }

    return particleElements;
  };

  return (
    <>
      {/* SVG filter definition for glow effect */}
      <defs>
        <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Main path */}
      <path
        ref={pathRef}
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={createCurvedPath()}
        markerEnd={markerEnd}
      />
      
      {/* Particles */}
      {particles.enabled && (
        <g>
          {createParticles()}
        </g>
      )}
    </>
  );
};

export default ParticleEdge;
