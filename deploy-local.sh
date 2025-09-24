#!/bin/bash

# deploy-local.sh - Start the diagram designer with Spring Boot backend for local development
set -e

echo "🚀 Starting local development environment..."

# Check required tools
echo "🔍 Checking required tools..."
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven not found. Please install Maven first:"
    echo "   https://maven.apache.org/install.html"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 21 first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "pom.xml" ] || [ ! -d "frontend" ] || [ ! -d "diagram-designer-api" ]; then
    echo "❌ This script must be run from the project root directory."
    echo "   Make sure you have frontend/ and diagram-designer-api/ directories."
    exit 1
fi

# Check for configuration file and source it
if [ -f ".config.env" ]; then
    echo "📝 Loading configuration from .config.env"
    set -a  # Automatically export variables
    source .config.env
    set +a  # Turn off auto-export
else
    echo "⚠️  No .config.env file found."
    if [ -f ".config.env.template" ]; then
        echo "   Run: cp .config.env.template .config.env"
        echo "   Then edit .config.env with your values"
    fi
    echo "   Continuing with environment variables only..."
fi

# Create application.yml for local development if it doesn't exist
if [ ! -f "diagram-designer-api/src/main/resources/application-local.yml" ]; then
    echo "📝 Creating local development configuration..."
    cat > diagram-designer-api/src/main/resources/application-local.yml << 'EOF'
spring:
  profiles:
    active: dev

server:
  port: 3001

logging:
  level:
    com.example.diagramdesigner: DEBUG

metrics:
  proxy:
    enable-caching: false
    auth:
      rabbitmq.example.com:
        type: basic
        username: ${RABBITMQ_USERNAME:admin}
        password: ${RABBITMQ_PASSWORD:admin}
      monitoring.example.com:
        type: apikey
        header-name: X-API-Key
        header-value: ${MONITORING_API_KEY:demo-key}
      metrics.example.com:
        type: bearer
        token: ${METRICS_BEARER_TOKEN:demo-token}
EOF
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Build the Spring Boot application
echo "📦 Building Spring Boot application..."
mvn compile

if [ $? -ne 0 ]; then
    echo "❌ Spring Boot compilation failed."
    exit 1
fi

# Start both frontend and backend in parallel
echo "🌐 Starting development servers..."
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3001"
echo "🔧 Hot reload is enabled for frontend"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit
}
trap cleanup INT TERM

# Start Spring Boot backend in development mode
echo "🔄 Starting Spring Boot backend..."
cd diagram-designer-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 5

# Start frontend development server
echo "🔄 Starting frontend development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for either process to exit
wait $FRONTEND_PID $BACKEND_PID
