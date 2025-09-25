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

  // Debug logging
  console.log(`🎨 ParticleEdge ${id} - data:`, data);
  console.log(`🎨 ParticleEdge ${id} - particles:`, particles);
  console.log(`🎨 ParticleEdge ${id} - has text:`, !!particles?.text);
  console.log(`🎨 ParticleEdge ${id} - text value:`, particles?.text);

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
      // Use density to control particle spacing (higher density = closer particles)
      const baseStaggeer = 1.5;
      const densityFactor = (particles.density || 100) / 100;
      const staggerTime = baseStaggeer / densityFactor; // Higher density = shorter stagger
      const delay = (i / particleCount) * staggerTime;
      const baseSize = particles.size || 6; // Use configured size or default to 6
      const size = baseSize + Math.random() * 2 - 1; // Add slight randomness (-1 to +1)
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
          {particles.text && (() => {
            console.log(`🎯 Creating text for particle ${i}: "${particles.text}", color: ${particles.textColor}, fontSize: ${particles.fontSize}`);
            return (
              <text
              fontSize={particles.fontSize || 14}
              fill={particles.textColor || '#ffffff'}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="bold"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                textShadow: '0 0 4px rgba(0,0,0,0.8)'
              }}
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
            );
          })()}
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
