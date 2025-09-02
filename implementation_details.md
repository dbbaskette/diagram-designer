# Implementation Details - Diagram Designer

## Project Structure

### Clean Directory Layout
```
diagram-designer/
├── frontend/                 # React application (ACTIVE)
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   └── vite.config.ts       # Build configuration
├── public/                  # Shared assets
├── prompt/                  # AI assistant prompts
├── *.md                     # Documentation
└── *.png                    # Reference images
```

### Key Files
- **Active Source**: `frontend/src/` (all React code)
- **Configuration**: `frontend/public/diagram-config.json`
- **Build Config**: `frontend/vite.config.ts`
- **Dependencies**: `frontend/package.json`

## Technology Stack

### Frontend Dependencies
```json
{
  "react": "^19.1.1",                    // Latest React with concurrent features
  "react-dom": "^19.1.1",               // React DOM renderer
  "react-router-dom": "^7.8.2",         // Client-side routing
  "reactflow": "^11.11.4",              // Professional diagram library
  "@tanstack/react-query": "^5.85.9",   // Data fetching and caching
  "axios": "^1.11.0",                   // HTTP client
  "@fortawesome/fontawesome-free": "^7.0.0", // Icon library
  "tailwindcss": "^3.4.17",             // Utility-first CSS
  "typescript": "~5.8.3"                // Type safety
}
```

### Development Tools
- **Vite 7.1.4**: Fast build tool and dev server
- **ESLint**: Code linting and formatting
- **TypeScript**: Type checking and IntelliSense
- **PostCSS**: CSS processing with Tailwind

## Component Architecture

### App Structure
```typescript
App
├── QueryClientProvider     // Data fetching context
├── Router                  // Navigation routing
│   ├── Header             // Top navigation bar
│   ├── Sidebar            // Left navigation icons
│   └── Routes             // Page content
│       ├── DiagramView    // Main diagram (default)
│       ├── Construction1  // Coming soon page
│       └── Construction2  // Coming soon page
```

### Core Components

#### 1. DiagramView Component
**Location**: `frontend/src/components/DiagramView.tsx`

**Responsibilities**:
- Load diagram configuration from JSON
- Convert config to ReactFlow nodes and edges
- Handle diagram interactions (zoom, pan, connect)
- Manage real-time data updates

**Key Features**:
```typescript
// Configuration loading
const loadConfig = async () => {
  const response = await fetch('/diagram-config.json');
  const data: DiagramConfig = await response.json();
  // Convert to ReactFlow format
};

// Node positioning
const flowNodes = data.nodes.map((node, index) => ({
  id: node.name,
  type: 'custom',
  position: node.position || { x: index * 300 + 100, y: 200 },
  data: { ...node, config: data.config }
}));
```

#### 2. CustomNode Component
**Location**: `frontend/src/components/CustomNode.tsx`

**Responsibilities**:
- Render individual diagram nodes
- Display icons, metrics, and status
- Handle connection points
- Show real-time data

**Structure**:
```typescript
<>
  <Handle type="target" position={Position.Left} />
  <div className="diagram-node">
    <div className="diagram-node-icon">{icon}</div>
    <div className="status-indicator" />
  </div>
  <div className="diagram-node-info">
    <div className="title">{displayName}</div>
    <div className="description">{description}</div>
  </div>
  <div className="diagram-node-metrics-grid">
    {dataGrid.map(item => (
      <div className="metric-row">
        <div className="label">{item.label}</div>
        <div className="value">{randomValue}</div>
      </div>
    ))}
  </div>
  <Handle type="source" position={Position.Right} />
</>
```

#### 3. ComingSoon Component
**Location**: `frontend/src/components/ComingSoon.tsx`

**Purpose**: Placeholder for future features with consistent styling.

## Configuration System

### Diagram Configuration Schema
**File**: `frontend/public/diagram-config.json`

```typescript
interface DiagramConfig {
  config: {
    layout: 'horizontal' | 'vertical';
    updateInterval: number;        // Milliseconds
    title: string;
  };
  nodes: DiagramNode[];
}

interface DiagramNode {
  name: string;                   // Unique identifier
  displayName: string;            // User-friendly name
  description: string;            // Node description
  icon: string;                   // FontAwesome class or SVG path
  position?: { x: number; y: number }; // Optional positioning
  dataGrid: DataGridItem[];       // Metrics configuration
  connectTo: string[];            // Child node names (data flows TO these)
  lineType: 'solid' | 'dashed';   // Connection line style
  lineColor: string;              // Hex color code
  particles: {                    // Animation settings
    enabled: boolean;
    speed?: number;
    density?: number;
    color?: string;
  };
}

interface DataGridItem {
  label: string;                  // Display label
  key: string;                    // API key/token
  url: string;                    // API endpoint
  valueField: string;             // JSON field to extract
}
```

### Configuration Loading Process
1. **Fetch**: Load JSON from `/public/diagram-config.json`
2. **Parse**: Convert to TypeScript interfaces
3. **Transform**: Convert to ReactFlow format
4. **Render**: Display in diagram

## Styling System

### Tailwind CSS Configuration
**File**: `frontend/tailwind.config.js`

**Custom Classes**:
```css
/* Node styling */
.diagram-node {
  @apply bg-gray-800/90 border-2 rounded-full w-[80px] h-[80px];
  transition: all 0.3s ease;
}

.diagram-node.healthy {
  @apply border-green-500;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

/* Metrics grid */
.diagram-node-metrics-grid {
  @apply bg-gray-800/90 border border-green-500 rounded;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
}
```

### Color Scheme
- **Background**: Dark gray (`bg-gray-900`)
- **Cards**: Semi-transparent gray (`bg-gray-800/50`)
- **Text**: White primary, gray secondary
- **Accents**: Blue for primary actions, green for status
- **Borders**: Gray with opacity for subtle separation

## Data Flow Implementation

### Current State (Mocked)
```typescript
// In CustomNode component
<div className="diagram-node-metric-value">
  {Math.floor(Math.random() * 1000).toLocaleString()}
</div>
```

### Planned Real Implementation
```typescript
// Using React Query for data fetching
const { data: metrics, isLoading } = useQuery({
  queryKey: ['metrics', node.name],
  queryFn: () => fetchMetrics(node.dataGrid),
  refetchInterval: config.updateInterval
});
```

### API Integration Points
1. **Metrics Endpoints**: Each `DataGridItem` has `url` and `key`
2. **Authentication**: API keys stored in configuration
3. **Data Extraction**: `valueField` specifies which JSON field to use
4. **Update Frequency**: Configurable via `updateInterval`

## Build and Development

### Development Server
```bash
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Build Process
1. **TypeScript Compilation**: `tsc -b`
2. **Vite Bundling**: Optimized production build
3. **Asset Processing**: CSS, images, fonts
4. **Output**: `frontend/dist/` directory

### Development Workflow
1. Edit files in `frontend/src/`
2. Vite provides hot module replacement
3. Changes reflect immediately in browser
4. TypeScript provides type checking

## Performance Considerations

### Current Optimizations
- **React 19**: Concurrent features for better performance
- **Vite**: Fast build times and HMR
- **Tailwind**: Utility-first CSS reduces bundle size
- **ReactFlow**: Optimized for large diagrams

### Planned Optimizations
- **Code Splitting**: Lazy load components
- **Memoization**: Prevent unnecessary re-renders
- **Virtual Scrolling**: For large node lists
- **Image Optimization**: Compress and lazy load assets

## Security Implementation

### Current Security Issues
- API keys exposed in client-side code
- No authentication or authorization
- No input validation

### Planned Security Measures
- **Backend Proxy**: Hide API keys in server
- **Environment Variables**: Secure configuration
- **Input Validation**: Sanitize all user inputs
- **HTTPS**: Secure data transmission

## Testing Strategy

### Current State
- No automated tests
- Manual testing only

### Planned Testing
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Playwright for full user flows
- **Visual Regression**: Screenshot testing

## Deployment Architecture

### Current State
- Frontend-only application
- Static file serving
- No backend services

### Planned Deployment
- **Frontend**: Vercel/Netlify for static hosting
- **Backend**: Spring Boot on cloud platform
- **Database**: PostgreSQL for configuration storage
- **CDN**: Asset delivery optimization

## Monitoring and Observability

### Current State
- Browser console logging only
- No error tracking
- No performance monitoring

### Planned Monitoring
- **Error Tracking**: Sentry integration
- **Performance**: Web Vitals monitoring
- **Analytics**: User interaction tracking
- **Health Checks**: API endpoint monitoring
