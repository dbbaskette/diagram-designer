import React, { useRef } from 'react';

interface ParticleEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
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
  style = {},
  data,
  markerEnd,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  
  // Get particle configuration from data
  const particles = data?.particles || { enabled: false };

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

  // Create particles along the path
  const createParticles = () => {
    if (!particles.enabled) return [];

    const particleCount = particles.count || 5;
    const particleElements = [];

    // Create path based on direction
    // If direction is "source", particles flow out of the node (normal direction)
    // If direction is "target", particles flow into the node (normal direction)
    const pathData = createCurvedPath(); // Always use normal direction for now

    // Debug logging
    console.log(`Particle direction: ${particles.direction}, pathData: ${pathData}`);

    for (let i = 0; i < particleCount; i++) {
      const delay = (i / particleCount) * 1.5; // Stagger particles
      const size = 3 + Math.random() * 2; // Random size between 3-5
      const animationDuration = `${(particles.speed || 5) > 0 ? (11 - (particles.speed || 5)) / 3 : 1.5}s`;

      particleElements.push(
        <g key={`particle-group-${i}`}>
          <circle
            r={size}
            fill={particles.color || '#3498db'}
            opacity={0.9}
            filter="url(#particle-glow)"
          >
            <animateMotion
              dur={animationDuration}
              repeatCount="indefinite"
              begin={`${delay}s`}
              path={pathData}
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur={animationDuration}
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

          {/* Add text that moves with the particle */}
          {particles.text && (
            <text
              fontSize={particles.fontSize || 12}
              fill={particles.textColor || 'white'}
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight="bold"
              filter="url(#text-glow)"
              opacity={0.9}
            >
              {particles.text}
              <animateMotion
                dur={animationDuration}
                repeatCount="indefinite"
                begin={`${delay}s`}
                path={pathData}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur={animationDuration}
                repeatCount="indefinite"
                begin={`${delay}s`}
              />
            </text>
          )}
        </g>
      );
    }

    return particleElements;
  };

  // Create static edge label
  const createEdgeLabel = () => {
    if (!particles.label) return null;

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    return (
      <text
        x={midX}
        y={midY - 10} // Position slightly above the line
        fontSize={particles.fontSize || 12}
        fill={particles.textColor || 'white'}
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="bold"
        filter="url(#text-glow)"
        className="select-none pointer-events-none"
      >
        {particles.label}
      </text>
    );
  };

  return (
    <>
      {/* SVG filter definitions for glow effects */}
      <defs>
        <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
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

      {/* Static edge label */}
      {createEdgeLabel()}
    </>
  );
};

export default ParticleEdge;
