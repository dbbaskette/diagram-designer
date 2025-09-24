#!/bin/bash

# deploy-local-prod.sh - Build and serve the diagram designer in production mode locally
set -e

echo "🚀 Starting local production deployment of Diagram Designer..."

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

echo "🔧 Building the complete application for production..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Application build failed."
    exit 1
fi

echo "🌐 Starting local production server..."
echo ""
echo "✅ Application will be available at:"
echo "   http://localhost:8080"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

# Start the Spring Boot application in production mode
cd diagram-designer-api
java -jar target/diagram-designer-api-1.0.0.jar --spring.profiles.active=prod
