# Mental Model - Diagram Designer

## Project Overview

The Diagram Designer is a React-based web application that creates interactive dataflow diagrams with real-time metrics. It's designed to be a configurable platform for visualizing system architectures and data flows.

## Core Architecture

### Frontend-Only Application
- **Technology Stack**: React 19.1.1 + TypeScript + Vite + Tailwind CSS
- **Diagram Engine**: ReactFlow for interactive node-based diagrams
- **State Management**: React Query for API data fetching and caching
- **Routing**: React Router for navigation between different views

### Key Components

#### 1. Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Title + User Info + Status)     │
├─────────┬───────────────────────────────┤
│ Sidebar │ Main Content Area             │
│ (Icons) │ - Main Diagram View           │
│         │ - Construction Views          │
│         │ - Settings (planned)          │
└─────────┴───────────────────────────────┘
```

#### 2. Navigation System
- **Main Diagram**: Primary dataflow visualization
- **Construction 1 & 2**: Placeholder views for future features
- **Settings**: Planned configuration interface

#### 3. Diagram Engine
- **Nodes**: Custom components with icons, metrics, and status indicators
- **Edges**: Configurable connections with animations and styling
- **Layout**: Horizontal or vertical flow support
- **Interactivity**: Drag, zoom, pan, and connection capabilities

## Data Flow Architecture

### Configuration-Driven Design
```
JSON Config → ReactFlow Nodes → Real-time Metrics → Visual Updates
```

1. **Configuration Source**: `/public/diagram-config.json`
2. **Node Definition**: Each node has icon, metrics, connections, and styling
3. **Metrics Integration**: API endpoints for real-time data (currently mocked)
4. **Visual Rendering**: Custom React components with Tailwind styling

### Node Structure
Each diagram node contains:
- **Visual Elements**: Icon, status indicator, title, description
- **Metrics Grid**: 2x2 table showing real-time data
- **Connection Points**: Input/output handles for data flow
- **Styling**: Colors, animations, and visual effects

### Connection Model (Source-Destination Relationship)
- **Source Node**: `connectTo: ["DestinationName"]` (data flows FROM this node)
- **Destination Node**: `connectTo: []` (data flows TO this node, final destination)
- **Visual Connection**: Source (right side) → Destination (left side)
- **Data Flow Direction**: Source → Destination
- **Example**: A connects to B means A→B (A's right connects to B's left)

## Key Design Principles

### 1. Configuration Externalization
- All diagram structure defined in JSON
- No hardcoded nodes or connections
- Easy to modify without code changes

### 2. Real-time Data Integration
- API endpoints for metrics
- Configurable update intervals
- Live data visualization

### 3. Responsive Design
- Dark theme optimized for monitoring dashboards
- Mobile-friendly responsive layout
- Accessible color schemes and contrast

### 4. Extensibility
- Modular component architecture
- Easy to add new node types
- Pluggable metrics providers

## Current State

### Implemented Features
- ✅ Basic React application structure
- ✅ Navigation sidebar with 3 main sections
- ✅ ReactFlow diagram integration
- ✅ Custom node components with metrics
- ✅ JSON configuration system
- ✅ Responsive dark theme UI
- ✅ FontAwesome icon support
- ✅ SVG icon support for custom assets

### Configuration Schema
The `diagram-config.json` supports:
- Global layout settings (horizontal/vertical)
- Node definitions with icons, metrics, and connections
- Line styling (solid/dashed, colors, animations)
- Particle effects for data flow visualization

### Technical Dependencies
- **React 19.1.1**: Latest React with concurrent features
- **ReactFlow 11.11.4**: Professional diagram library
- **Tailwind CSS 3.4.17**: Utility-first styling
- **TypeScript 5.8.3**: Type safety and development experience
- **Vite 7.1.4**: Fast build tool and dev server

## Future Architecture Considerations

### Backend Integration
- Spring Boot service for configuration management
- Real API endpoints for metrics data
- User authentication and authorization
- Configuration versioning and history

### Advanced Features
- Node templates and libraries
- Drag-and-drop node creation
- Export capabilities (PNG, SVG, PDF)
- Collaboration features
- Real-time multi-user editing

### Scalability
- Microservices architecture for different diagram types
- Caching strategies for large diagrams
- Performance optimization for complex flows
- Mobile app development
