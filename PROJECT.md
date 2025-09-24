# Diagram Designer Project

## Project Overview & Goal

**Primary Goal**: Create a platform for building interactive, real-time system architecture diagrams with secure authentication and dynamic configuration.

**End Users**: Developers, system architects, and operations teams who need to visualize system dataflows with live metrics.

## Current Status

✅ **Completed Features**:
- Spring Boot + React hybrid architecture
- Secure variable substitution system
- Dynamic authentication for any service
- Interactive drag & drop positioning
- Multi-diagram support
- Real-time metrics display
- Animated particle flows
- Cloud Foundry deployment ready

## Tech Stack

### Backend
- **Java 21** with **Spring Boot 3.5.6**
- **Maven** for build management
- **Spring WebClient** for reactive HTTP calls
- **Jackson** for JSON processing

### Frontend
- **React 19.1.1** with **TypeScript 5.x**
- **Vite 7.x** for build tooling
- **ReactFlow 12.x** for diagram visualization
- **TailwindCSS 3.x** for styling
- **@tanstack/react-query** for state management

### Deployment
- **Cloud Foundry** ready
- **Local development** with hot reload
- **Environment variable** based configuration

## Architecture & Design

### Directory Structure
```
diagram-designer/
├── configs/                    # JSON diagram configurations
├── backend/                    # Spring Boot application
│   ├── src/main/java/         # Java source code
│   └── manifest.yml           # Cloud Foundry manifest
├── frontend/                   # React application
│   ├── src/                   # TypeScript source code
│   └── dist/                  # Built frontend assets
├── .config.env.template       # Environment variables template
├── .config.env               # Local environment variables (git-ignored)
└── deploy.sh                 # Deployment script
```

### Key Components

**Spring Boot Backend**:
- `DiagramController` - Serves JSON configs with variable substitution
- `MetricsProxyController` - Proxies API calls with authentication
- `AuthenticationResolver` - Dynamic credential matching
- `ConfigurationProcessor` - Handles `${VARIABLE}` substitution

**React Frontend**:
- `DiagramView` - Main diagram visualization
- `CustomNode` - Interactive diagram nodes
- `Settings` - Configuration management
- `App` - Main application and routing

## Security Features

1. **No Client-side Secrets**: All credentials handled server-side
2. **Dynamic Authentication**: Automatic credential matching by hostname patterns
3. **Variable Substitution**: Runtime replacement of `${VARIABLES}` in JSON
4. **CORS Protection**: Configurable cross-origin policies
5. **Git-safe Configuration**: Sensitive data never committed

## Authentication Patterns

The system supports multiple authentication methods:
- **Basic Auth**: `SERVICE_USERNAME` + `SERVICE_PASSWORD`
- **API Keys**: `SERVICE_API_KEY` → `X-API-Key` header
- **Bearer Tokens**: `SERVICE_BEARER_TOKEN` → `Authorization: Bearer`
- **Custom Headers**: `SERVICE_CLIENT_ID` + `SERVICE_CLIENT_HEADER`

## Configuration System

### Environment Variables (.config.env)
```bash
# Service credentials
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=secret123
MONITORING_API_KEY=abc123xyz789
PROMETHEUS_BEARER_TOKEN=jwt_token_here
```

### JSON Configuration (configs/*.json)
```json
{
  "config": {
    "title": "My System",
    "layout": "horizontal",
    "updateInterval": 30000
  },
  "nodes": [
    {
      "name": "web-server",
      "displayName": "Web Server",
      "icon": "fas fa-server",
      "url": "https://${WEB_HOSTNAME:web.example.com}",
      "status": {
        "url": "https://${WEB_HOSTNAME}/health"
      },
      "dataGrid": [
        {
          "label": "Requests/sec",
          "url": "https://${WEB_HOSTNAME}/metrics",
          "valueField": "requests_per_second"
        }
      ],
      "connectTo": ["database"],
      "particles": {
        "enabled": true,
        "speed": 3,
        "color": "#3498db"
      }
    }
  ]
}
```

## Coding Standards & Conventions

### Java (Backend)
- **Style**: Google Java Style Guide + Spring Boot best practices
- **Naming**: `camelCase` for variables, `PascalCase` for classes
- **Services**: Suffix with `Service` (e.g., `MetricsProxyService`)
- **Controllers**: Suffix with `Controller` (e.g., `DiagramController`)
- **Error Handling**: Use `ResponseEntity<?>` with appropriate HTTP status codes

### TypeScript (Frontend)
- **Style**: Standard TypeScript/React conventions
- **Components**: PascalCase function components
- **Props**: Defined interfaces for all component props
- **State**: Use React hooks and @tanstack/react-query for server state

### API Design
- **RESTful**: Standard HTTP verbs (GET, POST, PUT, DELETE)
- **Endpoints**: `/api/diagrams`, `/api/proxy/**`
- **CORS**: Properly configured for development and production

## Important Do's and Don'ts

### DO
✅ Write unit tests for all new business logic
✅ Log important events and errors
✅ Use environment variables for all secrets
✅ Follow Spring Boot security best practices
✅ Validate JSON configurations
✅ Handle authentication errors gracefully

### DON'T
❌ Commit secrets or API keys to repository
❌ Hardcode service-specific logic (keep it generic)
❌ Expose internal service URLs to frontend
❌ Use `@CrossOrigin(origins = "*")` in production
❌ Log sensitive data (passwords, tokens)
❌ Skip error handling for external API calls

## Development Workflow

### Local Development
1. Copy `.config.env.template` to `.config.env`
2. Add your service credentials to `.config.env`
3. Place JSON configs in `configs/` directory
4. Run `./deploy-local.sh` for development server
5. Access at `http://localhost:8080`

### Production Deployment
1. Set environment variables in Cloud Foundry
2. Run `./deploy.sh` for automated deployment
3. Monitor logs with `cf logs diagram-designer`

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] User authentication and authorization
- [ ] Diagram versioning and history
- [ ] Template library for common architectures
- [ ] Export to various formats (PNG, PDF, etc.)
- [ ] Integration with monitoring systems (Grafana, Datadog)