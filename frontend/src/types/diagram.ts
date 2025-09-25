export interface DiagramConfig {
  config: {
    layout: 'horizontal' | 'vertical';
    updateInterval: number;
    title: string;
    nodeGlow?: {
      enabled: boolean;
      intensity: number;
      spread: number;
    };
  };
  nodes: DiagramNode[];
}

export interface Connection {
  target: string;
  outputHandle?: number; // Which output handle to use (0-based index)
  inputHandle?: number;  // Which input handle to use on target (0-based index)
  lineType?: 'solid' | 'dashed';
  lineColor?: string;
  edgeType?: 'default' | 'smoothstep' | 'straight' | 'step' | 'curved' | 'particle';
  particles?: {
    enabled: boolean;
    speed?: number;
    density?: number;
    color?: string;
    size?: number;        // Size of the particles (default: 6)
    count?: number;       // Number of particles per line
    direction?: 'source' | 'target'; // 'source' = particles flow out, 'target' = particles flow in
    text?: string;        // Text that moves with particles
    label?: string;       // Static text label on the edge
    fontSize?: number;    // Size of the text (default: 12)
    textColor?: string;   // Color of the text (default: white)
  };
}

export interface DiagramNode {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  position?: { x: number; y: number };
  circleColor?: string; // Color of the node circle border and glow
  url?: string; // URL to open when component is clicked
  clickBehavior?: 'modal' | 'url' | 'both'; // How clicking the node should behave
  status?: {
    url: string;
    valueField: string;
    upValue: string;
    downValue: string;
    updateInterval: number;
  };
  dataGrid: DataGridItem[];
  connectTo: (string | Connection)[]; // Support both simple strings and detailed connections
  lineType: 'solid' | 'dashed';
  lineColor: string;
  edgeType?: 'default' | 'smoothstep' | 'straight' | 'step' | 'curved' | 'particle';
  particles: {
    enabled: boolean;
    speed?: number;
    density?: number;
    color?: string;
    size?: number;        // Size of the particles (default: 6)
    count?: number;       // Number of particles per line
    direction?: 'source' | 'target'; // 'source' = particles flow out, 'target' = particles flow in
    text?: string;        // Text that moves with particles
    label?: string;       // Static text label on the edge
    fontSize?: number;    // Size of the text (default: 12)
    textColor?: string;   // Color of the text (default: white)
  };
  handles?: {
    input?: number;  // Number of input handles on the left
    output?: number; // Number of output handles on the right
  };
}

export interface DataGridItem {
  label: string;
  url: string;
  valueField: string;
}

export interface NodeMetrics {
  [key: string]: any;
}

export interface NodeData extends DiagramNode {
  config: {
    layout: 'horizontal' | 'vertical';
    updateInterval: number;
    title: string;
    nodeGlow?: {
      enabled: boolean;
      intensity: number;
      spread: number;
    };
  };
  showCoordinates?: boolean;
}