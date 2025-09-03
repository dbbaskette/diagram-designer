# Diagram Configuration Documentation

This document explains all available options for the `diagram-config.json` file.

## Global Configuration

```json
{
  "config": {
    "layout": "horizontal",           // Layout direction: "horizontal" | "vertical"
    "updateInterval": 30000,         // Metrics update interval in milliseconds
    "title": "System Architecture Diagram",  // Diagram title (displays in header)
    "nodeGlow": {                    // Global glow effect for all nodes
      "enabled": true,               // Enable/disable glow effect
      "intensity": 8,                // Glow intensity (1-20)
      "spread": 12                   // Glow spread radius in pixels
    }
  }
}
```

## Node Configuration

Each node in the `nodes` array supports the following properties:

### Required Properties

- **`name`** (string): Unique identifier for the node
- **`displayName`** (string): Human-readable name displayed on the node
- **`description`** (string): Description text shown below the node title
- **`icon`** (string): Icon for the node
  - FontAwesome icons: `"fas fa-server"`
  - Local images: `"/assets/icons/icon.svg"` or `"/assets/icons/icon.png"`
  - Emoji icons: `"🚗"`, `"🗄️"`, `"⚙️"`, `"🗃️"`, `"📝"`
- **`dataGrid`** (array): Array of metrics to display in the node's grid

### Optional Properties

- **`position`** (object): Node position on the diagram
  ```json
  {
    "x": 100,  // X coordinate
    "y": 200   // Y coordinate
  }
  ```

- **`url`** (string, optional): URL to open when the component is clicked
  ```json
  {
    "url": "https://dashboard.example.com"
  }
  ```
  - Opens in a new browser window/tab
  - Makes the component clickable with hover effects

- **`connectTo`** (array): Defines connections TO this node (right-to-left definition)
  - Simple string: `"NodeName"`
  - Detailed object: `{"target": "NodeName", "outputHandle": 0, "inputHandle": 0}`
  
  **Connection Logic Rule: For A → B (A connects to B):**
  - **A** has `"connectTo": []` (A sends connections, doesn't receive)
  - **B** has `"connectTo": ["A"]` (B receives connection FROM A)

- **`lineType`** (string): Line style for connections FROM this node
  - `"solid"`: Solid lines
  - `"dashed"`: Dashed lines

- **`lineColor`** (string): Color for connections FROM this node
  - Hex colors: `"#3498db"`
  - Named colors: `"blue"`, `"red"`, `"green"`

- **`edgeType`** (string): Type of edge/connection line
  - `"default"`: Standard ReactFlow edge
  - `"smoothstep"`: Curved with rounded corners
  - `"straight"`: Direct straight lines
  - `"step"`: Stepped lines with sharp corners
  - `"curved"`: Custom smooth curves without 90-degree turns

- **`particles`** (object): Animation settings for connection lines
  ```json
  {
    "enabled": true,        // Enable/disable particle animation
    "speed": 5,            // Animation speed (1=slow, 10=fast)
    "density": 150,        // Particle density (legacy)
    "color": "#3498db",    // Particle color
    "count": 5,            // Number of particles per line
    "direction": "source"  // "source" = particles flow out, "target" = particles flow in
  }
  ```

- **`handles`** (object): Connection point configuration
  ```json
  {
    "input": 1,   // Number of input handles on the left side
    "output": 2   // Number of output handles on the right side
  }
  ```

- **`status`** (object): Health status monitoring configuration
  ```json
  {
    "url": "https://api.example.com/health",     // API endpoint to check
    "key": "bearer-token-123",                   // Authentication key/token
    "valueField": "status",                      // JSON field to check
    "upValue": "healthy",                        // Value that indicates "up"
    "downValue": "unhealthy",                    // Value that indicates "down"
    "updateInterval": 10000                      // Check interval in milliseconds
  }
  ```

## Data Grid Configuration

Each item in the `dataGrid` array represents a metric displayed in the node:

```json
{
  "label": "Traffic",                    // Display label
  "key": "xyz-apikey-for-webserver",    // API key/identifier
  "url": "https://api.example.com/...", // API endpoint
  "valueField": "requestsPerSecond"     // JSON field to extract value
}
```

## Connection Configuration

### Simple Connection
```json
"connectTo": ["NodeName"]
```

### Detailed Connection
```json
"connectTo": [
  {
    "target": "NodeName",      // Target node name
    "outputHandle": 0,         // Which output handle to use (0-based)
    "inputHandle": 0           // Which input handle on target (0-based)
  }
]
```

## Connection Logic (Right-to-Left Definition)

- **`connectTo`** defines what connects TO this node from the left
- **Visual flow** goes left to right
- **Connection properties** (color, style, particles) come from the source node

### Example Flow:
```
WebServer → Data Exchange → TestItem
                    ↓
              TanzuDatalake
```

## Available Edge Types

1. **`"default"`**: Standard ReactFlow edge with basic styling
2. **`"smoothstep"`**: Curved edges with rounded corners (good for 90-degree turns)
3. **`"straight"`**: Direct straight lines between nodes
4. **`"step"`**: Stepped lines with sharp corners
5. **`"curved"`**: Custom smooth curves without 90-degree turns (most natural looking)
6. **`"particle"`**: **NEW**: Automatically used when particles are enabled - combines curved edges with animated particles

### Particle Edge Behavior
- When `particles.enabled: true`, the edge type automatically becomes `"particle"`
- Combines the specified `edgeType` with animated particles
- Particles follow the path of the connection line
- Configurable particle count, speed, and color

### Particle Direction
- **`"source"`**: Particles flow FROM this node TO the connected node (outward flow)
- **`"target"`**: Particles flow FROM the connected node TO this node (inward flow)
- **Source node control**: The source node (the one that sends data) controls the particle direction
- **Right-to-left definition**: The node on the right defines the connection back to the left
- **Visual flow**: 
  - `"source"`: Particles start at this node and move toward the connected node
  - `"target"`: Particles start at the connected node and move toward this node

## Handle Configuration

- **Single handles**: `{"input": 1, "output": 1}` - One connection point each side
- **Multiple handles**: `{"input": 1, "output": 3}` - Multiple output points for fan-out connections
- **No handles**: Omit the property to use defaults

## Icon Options

### FontAwesome Icons
```json
"icon": "fas fa-server"     // Server icon
"icon": "fas fa-database"   // Database icon
"icon": "fas fa-cloud"      // Cloud icon
```

### Local Images
```json
"icon": "/assets/icons/RabbitMQ.svg"
"icon": "/assets/icons/hadoop.svg"
"icon": "/assets/icons/tanzu.png"
```

## Color Examples

```json
"lineColor": "#3498db"  // Blue
"lineColor": "#2ecc71"  // Green
"lineColor": "#e74c3c"  // Red
"lineColor": "#f39c12"  // Orange
"lineColor": "#9b59b6"  // Purple
```

## Complete Example

```json
{
  "config": {
    "layout": "horizontal",
    "updateInterval": 30000,
    "title": "My System Diagram"
  },
  "nodes": [
    {
      "name": "MyNode",
      "displayName": "My Service",
      "description": "Description of my service",
      "icon": "fas fa-server",
      "position": { "x": 100, "y": 200 },
      "dataGrid": [
        {
          "label": "CPU Usage",
          "key": "cpu-key",
          "url": "https://api.example.com/cpu",
          "valueField": "usage"
        }
      ],
      "connectTo": [],
      "lineType": "solid",
      "lineColor": "#3498db",
      "edgeType": "curved",
      "particles": {
        "enabled": true,
        "speed": 2,
        "density": 100,
        "color": "#3498db"
      },
      "handles": {
        "input": 1,
        "output": 1
      }
    }
  ]
}
```
