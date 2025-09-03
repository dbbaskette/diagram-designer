import React from 'react';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: any;
  markerEnd?: string;
}

const CustomCurvedEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}) => {
  // Create a more curved path using quadratic curves
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

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={createCurvedPath()}
        markerEnd={markerEnd}
      />
    </>
  );
};

export default CustomCurvedEdge;
