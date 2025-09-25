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

# Step 1: Sync configuration files to resources directory
echo "🔧 Syncing latest configs to resources directory..."

# Copy main config files
cp "configs/Telemetry-Processing.json" "diagram-designer-api/src/main/resources/static/configs/"

# Create details directory if it doesn't exist
mkdir -p "diagram-designer-api/src/main/resources/static/configs/details"

# Copy all detail config files
cp configs/details/*.json "diagram-designer-api/src/main/resources/static/configs/details/" 2>/dev/null || echo "No detail configs to copy"
cp configs/details/*.html "diagram-designer-api/src/main/resources/static/configs/details/" 2>/dev/null || echo "No detail HTML files to copy"

# Verify the main config has text properties
if grep -q '"text"' "diagram-designer-api/src/main/resources/static/configs/Telemetry-Processing.json"; then
    echo "✅ Text properties confirmed in resources config"
else
    echo "❌ Text properties missing in resources config"
fi

# Verify gpdb.json was copied
if [ -f "diagram-designer-api/src/main/resources/static/configs/details/gpdb.json" ]; then
    echo "✅ gpdb.json copied to resources"
else
    echo "❌ gpdb.json missing in resources"
fi

# Step 1.5: Clean stale static resources to prevent caching issues
echo "🧹 Cleaning stale static resources to prevent caching issues..."
rm -rf "diagram-designer-api/src/main/resources/static/assets"
rm -f "diagram-designer-api/src/main/resources/static/index.html"
rm -f "diagram-designer-api/src/main/resources/static/manifest.json"
rm -f "diagram-designer-api/src/main/resources/static/vite.svg"
echo "✅ Stale static resources cleared"

# Step 2: Build the complete application (frontend + backend)
echo "📦 Building complete application with Maven (includes frontend build)..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Application build failed. Please fix build errors and try again."
    exit 1
fi

# Step 3: Check if logged into CF
echo "🔐 Checking Cloud Foundry login status..."
cf target > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Cloud Foundry. Please login first:"
    echo "   cf login -a <your-api-endpoint>"
    exit 1
fi

echo "✅ Logged into Cloud Foundry"
cf target

# Step 4: Set environment variables from .config.env (if it exists)
if [ -f ".config.env" ]; then
    echo "🔧 Setting Cloud Foundry environment variables from .config.env..."

    # Read each line from .config.env and set non-comment, non-empty lines as CF env vars
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments, empty lines, and lines that start with #
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi

        # Check if line contains = and extract key/value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]// /}"  # Remove spaces from key
            value="${BASH_REMATCH[2]}"

            # Only set authentication-related variables for security
            if [[ "$key" =~ (USERNAME|PASSWORD|API_KEY|BEARER_TOKEN|CLIENT_ID|SECRET|TOKEN)$ ]]; then
                echo "   Setting $key"
                cf set-env diagram-designer "$key" "$value" > /dev/null 2>&1
            fi
        fi
    done < ".config.env"

    echo "✅ Environment variables set"
else
    echo "⚠️  No .config.env file found - skipping environment variable setup"
fi

# Step 5: Deploy the application to Cloud Foundry
echo "🚀 Deploying application to Cloud Foundry..."
cd diagram-designer-api
cf push -f manifest.yml

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app should be available at the URL shown above"
    echo ""
    echo "💡 Next steps:"
    echo "1. Check the application logs if needed:"
    echo "   cf logs diagram-designer --recent"
    echo ""
    echo "2. Add more credentials to .config.env if needed, then redeploy to update"
else
    echo "❌ Deployment failed. Check the logs above for details."
    exit 1
fi
