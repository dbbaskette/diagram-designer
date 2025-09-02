# Quick Reference - Diagram Designer

## Project Commands

### Development
```bash
cd frontend
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure
```
diagram-designer/
├── frontend/                 # React app (WORK HERE)
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   └── package.json         # Dependencies
├── public/                  # Shared assets
└── *.md                     # Documentation
```

## Configuration Parameters

### Diagram Config (`frontend/public/diagram-config.json`)

#### Global Settings
```json
{
  "config": {
    "layout": "horizontal",        // "horizontal" | "vertical"
    "updateInterval": 30000,       // milliseconds (30 seconds)
    "title": "System Architecture Diagram"
  }
}
```

#### Node Configuration
```json
{
  "name": "unique-node-id",        // Required: unique identifier
  "displayName": "User Friendly",  // Required: display name
  "description": "Node purpose",   // Required: description text
  "icon": "fas fa-server",         // FontAwesome class or "/path/to/icon.svg"
  "position": { "x": 100, "y": 200 }, // Optional: manual positioning
  "dataGrid": [...],               // Required: metrics configuration
  "connectTo": ["node1", "node2"], // Required: child nodes (data flows TO these)
  "lineType": "solid",             // "solid" | "dashed"
  "lineColor": "#3498db",          // Hex color code
  "particles": {                   // Animation settings
    "enabled": true,
    "speed": 2,                    // 1-5 (optional)
    "density": 150,                // 50-300 (optional)
    "color": "#3498db"             // Hex color (optional)
  }
}
```

#### Metrics Configuration
```json
{
  "dataGrid": [
    {
      "label": "Display Label",           // Required: metric name
      "key": "api-key-or-token",         // Required: authentication
      "url": "https://api.example.com",  // Required: endpoint URL
      "valueField": "fieldName"          // Required: JSON field to extract
    }
  ]
}
```

## Component Props

### DiagramView
```typescript
// No props - loads configuration automatically
<DiagramView />
```

### CustomNode
```typescript
// Props provided by ReactFlow
interface NodeProps {
  data: NodeData;  // Contains node configuration
  selected: boolean;
  // ... other ReactFlow props
}
```

### ComingSoon
```typescript
interface ComingSoonProps {
  title: string;  // Required: page title
}
```

## TypeScript Interfaces

### Core Types
```typescript
interface DiagramConfig {
  config: {
    layout: 'horizontal' | 'vertical';
    updateInterval: number;
    title: string;
  };
  nodes: DiagramNode[];
}

interface DiagramNode {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  position?: { x: number; y: number };
  dataGrid: DataGridItem[];
  connectTo: string[];
  lineType: 'solid' | 'dashed';
  lineColor: string;
  particles: {
    enabled: boolean;
    speed?: number;
    density?: number;
    color?: string;
  };
}

interface DataGridItem {
  label: string;
  key: string;
  url: string;
  valueField: string;
}
```

## CSS Classes

### Node Styling
```css
.diagram-node              /* Main node container */
.diagram-node.healthy      /* Green status indicator */
.diagram-node.warning      /* Yellow status indicator */
.diagram-node.error        /* Red status indicator */
.diagram-node-icon         /* Icon container */
.diagram-node-info         /* Title and description */
.diagram-node-title        /* Node title */
.diagram-node-description  /* Node description */
.diagram-node-metrics-grid /* Metrics table container */
.diagram-node-metric-row   /* Individual metric row */
.diagram-node-metric-label /* Metric label cell */
.diagram-node-metric-value /* Metric value cell */
```

### Utility Classes
```css
.btn-primary              /* Primary button styling */
.btn-secondary            /* Secondary button styling */
.btn-danger               /* Danger button styling */
.card                     /* Card container */
.status-badge             /* Status indicator badge */
.status-online            /* Online status */
.status-offline           /* Offline status */
.status-warning           /* Warning status */
.form-input               /* Form input styling */
.form-select              /* Form select styling */
.nav-icon                 /* Navigation icon */
.nav-icon.active          /* Active navigation state */
```

## API Integration

### Current State (Mocked)
- All metrics use `Math.random()` for demo purposes
- No real API calls implemented

### Planned Implementation
```typescript
// Example API call structure
const fetchMetrics = async (dataGrid: DataGridItem[]) => {
  const results = await Promise.all(
    dataGrid.map(async (item) => {
      const response = await fetch(item.url, {
        headers: {
          'Authorization': `Bearer ${item.key}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return {
        label: item.label,
        value: data[item.valueField]
      };
    })
  );
  return results;
};
```

## Environment Variables

### Development
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=Diagram Designer
VITE_UPDATE_INTERVAL=30000
```

### Production
```bash
VITE_API_BASE_URL=https://api.diagram-designer.com
VITE_APP_TITLE=Diagram Designer
VITE_UPDATE_INTERVAL=30000
```

## Common Tasks

### Adding a New Node
1. Edit `frontend/public/diagram-config.json`
2. Add new node object to `nodes` array
3. Configure `dataGrid`, `connectTo` (child nodes), and styling
4. Save and refresh browser

### Understanding Connections
- **Source Node**: `connectTo: ["DestinationName"]` (data flows FROM this node)
- **Destination Node**: `connectTo: []` (data flows TO this node, final destination)
- **Visual Flow**: Source (right side) → Destination (left side)
- **Data Flow**: Source → Destination (A connects to B means A→B)

#### Example Flow: WebServer → RabbitMQ → Database
```json
{
  "name": "WebServer-01",
  "connectTo": ["Data Exchange"]    // WebServer flows TO RabbitMQ
},
{
  "name": "Data Exchange", 
  "connectTo": ["TanzuDatalake"]    // RabbitMQ flows TO Database
},
{
  "name": "TanzuDatalake",
  "connectTo": []                   // Database is final destination
}
```
**Visual Result**: WebServer (right) → RabbitMQ (left/right) → Database (left)
**Data Flow**: WebServer → RabbitMQ → Database

### Changing Layout
1. Edit `config.layout` in `diagram-config.json`
2. Set to `"horizontal"` or `"vertical"`
3. Save and refresh browser

### Adding Metrics
1. Add new object to node's `dataGrid` array
2. Configure `label`, `key`, `url`, and `valueField`
3. Save and refresh browser

### Styling Changes
1. Edit `frontend/src/index.css` for global styles
2. Edit component files for component-specific styles
3. Use Tailwind classes for utility styling

## Troubleshooting

### Common Issues
- **Node not appearing**: Check `name` field is unique
- **Connection not working**: Verify `connectTo` array has valid node names
- **Icon not showing**: Check icon path or FontAwesome class
- **Metrics not updating**: Currently mocked - implement real API calls

### Debug Commands
```bash
# Check for TypeScript errors
cd frontend && npx tsc --noEmit

# Check for linting errors
cd frontend && npm run lint

# Check build process
cd frontend && npm run build
```

### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API calls (when implemented)
- **Elements**: Inspect CSS and DOM structure
- **React DevTools**: Debug component state and props

## File Locations

### Key Files
- **Main App**: `frontend/src/App.tsx`
- **Diagram View**: `frontend/src/components/DiagramView.tsx`
- **Custom Node**: `frontend/src/components/CustomNode.tsx`
- **Configuration**: `frontend/public/diagram-config.json`
- **Types**: `frontend/src/types/diagram.ts`
- **Styles**: `frontend/src/index.css`

### Asset Locations
- **Icons**: `frontend/public/assets/icons/`
- **Logos**: `frontend/public/assets/logos/`
- **Images**: `frontend/public/`

## Development Tips

1. **Always work in `frontend/` directory**
2. **Use TypeScript for type safety**
3. **Follow existing component patterns**
4. **Test changes in browser immediately**
5. **Keep configuration in JSON file**
6. **Use Tailwind classes for styling**
7. **Check console for errors**
8. **Use React DevTools for debugging**
