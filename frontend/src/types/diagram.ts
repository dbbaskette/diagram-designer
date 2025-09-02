export interface DiagramConfig {
  config: {
    layout: 'horizontal' | 'vertical';
    updateInterval: number;
    title: string;
  };
  nodes: DiagramNode[];
}

export interface Connection {
  target: string;
  outputHandle?: number; // Which output handle to use (0-based index)
  inputHandle?: number;  // Which input handle to use on target (0-based index)
}

export interface DiagramNode {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  position?: { x: number; y: number };
  dataGrid: DataGridItem[];
  connectTo: (string | Connection)[]; // Support both simple strings and detailed connections
  lineType: 'solid' | 'dashed';
  lineColor: string;
  particles: {
    enabled: boolean;
    speed?: number;
    density?: number;
    color?: string;
  };
  handles?: {
    input?: number;  // Number of input handles on the left
    output?: number; // Number of output handles on the right
  };
}

export interface DataGridItem {
  label: string;
  key: string;
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
  };
}