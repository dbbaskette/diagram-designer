import React, { useRef } from 'react';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  data?: {
    particles?: {
      enabled?: boolean;
      speed?: number;
      density?: number;
      color?: string;
      size?: number;
      count?: number;
      text?: string;
      label?: string;
      fontSize?: number;
      textColor?: string;
    };
    sourceStatus?: 'up' | 'down' | 'unknown';
  };
  markerEnd?: string;
}

const STATUS_STROKE: Record<string, string> = {
  up: '#22c55e',
  down: '#ef4444',
  unknown: '#facc15',
};

const buildCurvedPath = (sx: number, sy: number, tx: number, ty: number) => {
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  const c1x = sx + (midX - sx) * 0.5;
  const c2x = tx - (tx - midX) * 0.5;
  return `M ${sx} ${sy} Q ${c1x} ${sy} ${midX} ${midY} Q ${c2x} ${ty} ${tx} ${ty}`;
};

const CustomEdge: React.FC<CustomEdgeProps> = ({
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
  const particles = data?.particles;
  const showParticles = !!particles?.enabled;
  const pathData = buildCurvedPath(sourceX, sourceY, targetX, targetY);

  // Apply health-aware stroke override when sourceStatus is provided
  const healthStroke = data?.sourceStatus ? STATUS_STROKE[data.sourceStatus] : undefined;
  const computedStyle: React.CSSProperties = healthStroke
    ? { ...style, stroke: healthStroke }
    : style;

  const particleElements = (() => {
    if (!showParticles) return null;
    const count = particles!.count || 5;
    const baseStagger = 1.5;
    const densityFactor = (particles!.density || 100) / 100;
    const staggerTime = baseStagger / densityFactor;
    const baseSize = particles!.size || 6;
    const speed = particles!.speed || 5;
    const animationDuration = `${speed > 0 ? (11 - speed) / 3 : 1.5}s`;
    const color = particles!.color || '#3498db';

    return Array.from({ length: count }, (_, i) => {
      const delay = (i / count) * staggerTime;
      const size = baseSize + Math.random() * 2 - 1;
      return (
        <g key={`p-${i}`}>
          <circle r={size} fill={color} opacity={0.9} filter="url(#particle-glow)">
            <animateMotion dur={animationDuration} repeatCount="indefinite" begin={`${delay}s`} path={pathData} />
            <animate attributeName="opacity" values="0;1;1;0" dur={animationDuration} repeatCount="indefinite" begin={`${delay}s`} />
            <animate attributeName="r" values={`${size};${size * 1.5};${size}`} dur="1.5s" repeatCount="indefinite" begin={`${delay}s`} />
          </circle>
          {particles!.text && (
            <text
              fontSize={particles!.fontSize || 14}
              fill={particles!.textColor || '#ffffff'}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
            >
              {particles!.text}
              <animateMotion dur={animationDuration} repeatCount="indefinite" begin={`${delay}s`} path={pathData} />
              <animate attributeName="opacity" values="0;1;1;0" dur={animationDuration} repeatCount="indefinite" begin={`${delay}s`} />
            </text>
          )}
        </g>
      );
    });
  })();

  const labelElement = particles?.label ? (
    <text
      x={(sourceX + targetX) / 2}
      y={(sourceY + targetY) / 2 - 10}
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
  ) : null;

  return (
    <>
      <path
        ref={pathRef}
        id={id}
        style={computedStyle}
        className="react-flow__edge-path"
        d={pathData}
        markerEnd={markerEnd}
      />
      {showParticles && <g>{particleElements}</g>}
      {labelElement}
    </>
  );
};

export default CustomEdge;
