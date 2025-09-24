# Architecture Documentation

## Overview

The Diagram Designer is a full-stack web application with a React frontend and Spring Boot backend, designed to visualize and interact with system diagrams and live metrics.

## Project Structure

```
diagram-designer/
├── configs/                          # Diagram configuration files
│   ├── diagram-config.json          # Main diagram configuration
│   ├── IMC-chatbot.json             # Chatbot architecture diagram
│   └── ...                          # Additional diagram configs
├── frontend/                        # React + TypeScript frontend
│   ├── src/                         # React source code
│   ├── dist/                        # Built frontend assets
│   └── package.json                 # Frontend dependencies
├── diagram-designer-api/            # Spring Boot backend module
│   ├── src/main/java/              # Java source code
│   ├── src/main/resources/         # Application resources
│   ├── target/                     # Build output
│   ├── pom.xml                     # Maven module configuration
│   └── manifest.yml               # Cloud Foundry deployment config
├── pom.xml                         # Parent Maven configuration
├── deploy.sh                       # Cloud Foundry deployment script
├── deploy-local.sh                 # Local development script
└── deploy-local-prod.sh           # Local production script
```

## Technology Stack

### Frontend
- **React 18** with TypeScript for UI components
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling
- **FontAwesome** for icons
- **ES Modules** with strict MIME type checking

### Backend
- **Spring Boot 3.x** with Java 21
- **Maven** for dependency management and build
- **Jackson** for JSON processing
- **Spring WebFlux** for HTTP client capabilities
- **Spring Actuator** for health checks

### Build System
- **Multi-module Maven** project structure
- **Integrated build process** - Maven builds both frontend and backend
- **Resource copying** - Frontend assets and configs automatically packaged

## Architecture Components

### 1. DiagramController (`/api/diagrams/*`)
- **Purpose**: Serves diagram configuration files
- **Key Features**:
  - Lists available diagram JSON files
  - Serves individual configs with variable substitution
  - Supports both filesystem (dev) and classpath (deployment) access
  - Security validation to prevent path traversal

### 2. SpaController
- **Purpose**: Serves the React SPA for all non-API routes
- **Key Features**:
  - Reads Vite's manifest.json to get correct asset paths
  - Dynamically generates HTML with proper script/CSS references
  - Handles client-side routing by forwarding to SPA

### 3. MetricsProxyController (`/api/proxy/*`)
- **Purpose**: Proxies requests to external metrics systems
- **Key Features**:
  - Multiple authentication methods (Basic, Bearer, API Key)
  - Request caching with configurable TTL
  - Timeout and error handling

### 4. ConfigurationProcessor
- **Purpose**: Processes environment variable substitutions in configs
- **Key Features**:
  - Replaces `${ENV_VAR}` placeholders with actual values
  - Supports default values with `${ENV_VAR:default}`

## Build Process

### Development Build
1. `mvn compile` - Compiles Java source and runs npm build for frontend
2. Frontend built to `frontend/dist/`
3. Maven copies frontend assets to `target/classes/static/`
4. Maven copies configs to `target/classes/configs/`

### Production Build
1. `mvn clean package -DskipTests`
2. Runs complete frontend build via exec-maven-plugin
3. Creates fat JAR with all resources embedded
4. Output: `diagram-designer-api/target/diagram-designer-api-1.0.0.jar`

## Deployment

### Local Development
- Frontend dev server: `http://localhost:5173`
- Backend API server: `http://localhost:3001`
- Hot reload enabled for frontend
- Uses filesystem access for configs

### Local Production
- Single server: `http://localhost:8080`
- Serves both frontend and API from Spring Boot
- Uses embedded resources in JAR

### Cloud Foundry
- Deployed as single JAR application
- Java buildpack with Java 21
- Environment variables for configuration
- Uses classpath resources for configs

## Key Design Decisions

### 1. Multi-Module Maven Structure
- **Rationale**: Provides unified build process while maintaining separation
- **Benefits**: Single command builds everything, consistent resource handling
- **Trade-offs**: Slightly more complex than separate builds

### 2. Dual Resource Access Pattern
- **Development**: Reads configs from filesystem for easy editing
- **Production**: Reads from classpath/JAR for deployment simplicity
- **Implementation**: `DiagramController.findConfigsDirectory()` tries filesystem first, falls back to classpath

### 3. Dynamic HTML Generation
- **Problem**: Vite generates different asset names on each build
- **Solution**: `SpaController` reads manifest.json to get current asset paths
- **Benefit**: No manual updating of asset references required

### 4. Spring Boot Static Resource Defaults
- **Previous Issue**: Custom WebConfig caused MIME type problems
- **Solution**: Removed custom configuration, rely on Spring Boot defaults
- **Result**: Correct Content-Type headers for JavaScript modules

## Security Considerations

1. **Path Traversal Prevention**: DiagramController validates file paths
2. **CORS Configuration**: Allows cross-origin requests for development
3. **Input Sanitization**: Environment variable substitution is controlled
4. **No Credential Exposure**: Secrets managed via environment variables

## Performance Optimizations

1. **Caching**: MetricsProxyService includes response caching
2. **Static Resource Handling**: Spring Boot's efficient static content serving
3. **Single JAR Deployment**: Reduces deployment complexity
4. **Resource Bundling**: Vite optimizes frontend bundle size