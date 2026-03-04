import React from 'react';

/**
 * Renders shared SVG filter definitions used by ParticleEdge components.
 *
 * This uses a declarative hidden SVG element instead of imperative DOM
 * manipulation. SVG filter IDs are globally accessible within the document,
 * so placing this component anywhere in the React tree makes the filters
 * available to all ParticleEdge instances via url(#particle-glow) and
 * url(#text-glow) references.
 *
 * This approach:
 * - Participates in React's reconciliation lifecycle
 * - Works correctly under React Strict Mode (no timing races)
 * - Is safe for SSR
 * - Avoids issues with multiple mounts/unmounts
 */
const SharedParticleEdgeDefs: React.FC = () => (
  <svg
    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    aria-hidden="true"
  >
    <defs>
      <filter
        id="particle-glow"
        x="-100%"
        y="-100%"
        width="300%"
        height="300%"
      >
        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

export default SharedParticleEdgeDefs;
