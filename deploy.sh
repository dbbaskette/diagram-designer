#!/bin/bash

# Diagram Designer - Cloud Foundry Deployment Script
# This script builds the frontend and Spring Boot backend for deployment

echo "🚀 Starting deployment to Cloud Foundry..."

# Check required tools
echo "🔍 Checking required tools..."
if ! command -v cf &> /dev/null; then
    echo "❌ Cloud Foundry CLI not found. Please install it first:"
    echo "   https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

if ! command -v mvn &> /dev/null; then
    echo "❌ Maven not found. Please install Maven first:"
    echo "   https://maven.apache.org/install.html"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 21 first."
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | awk -F '.' '{print $1}')
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo "⚠️  Java 21 is recommended. Current version: $JAVA_VERSION"
fi

# Check if we're in the project root
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
    echo "✅ Configuration loaded"
else
    echo "⚠️  No .config.env file found."
    if [ -f ".config.env.template" ]; then
        echo "   For local builds, run: cp .config.env.template .config.env"
        echo "   Then edit .config.env with your values"
    fi
    echo "   For Cloud Foundry, set environment variables with cf set-env"
    echo "   Continuing with environment variables only..."
fi

# Step 1: Build the complete application (frontend + backend)
echo "📦 Building complete application with Maven (includes frontend build)..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Application build failed. Please fix build errors and try again."
    exit 1
fi

# Step 2: Check if logged into CF
echo "🔐 Checking Cloud Foundry login status..."
cf target > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Cloud Foundry. Please login first:"
    echo "   cf login -a <your-api-endpoint>"
    exit 1
fi

echo "✅ Logged into Cloud Foundry"
cf target

# Step 3: Deploy the application to Cloud Foundry
echo "🚀 Deploying application to Cloud Foundry..."
cd diagram-designer-api
cf push -f manifest.yml

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app should be available at the URL shown above"
    echo ""
    echo "💡 Next steps:"
    echo "1. Set your service credentials as environment variables:"
    echo "   cf set-env diagram-designer RABBITMQ_USERNAME \"your_username\""
    echo "   cf set-env diagram-designer RABBITMQ_PASSWORD \"your_password\""
    echo "   cf set-env diagram-designer MONITORING_API_KEY \"your_api_key\""
    echo "   # Add more variables as needed for your services"
    echo ""
    echo "2. Restart the application to pick up new variables:"
    echo "   cf restage diagram-designer"
    echo ""
    echo "3. Check the application logs:"
    echo "   cf logs diagram-designer --recent"
else
    echo "❌ Deployment failed. Check the logs above for details."
    exit 1
fi
