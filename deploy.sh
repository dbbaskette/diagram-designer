#!/bin/bash

# Diagram Designer - Cloud Foundry Deployment Script

echo "🚀 Starting deployment to Cloud Foundry..."

# Check if CF CLI is installed
if ! command -v cf &> /dev/null; then
    echo "❌ Cloud Foundry CLI not found. Please install it first:"
    echo "   https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

# Change to frontend directory
cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in frontend directory."
    echo "   Make sure you're running this script from the project root."
    exit 1
fi

# Build the application
echo "📦 Building application for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

# Check if logged into CF
echo "🔐 Checking Cloud Foundry login status..."
cf target > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged into Cloud Foundry. Please login first:"
    echo "   cf login -a <your-api-endpoint>"
    exit 1
fi

echo "✅ Logged into Cloud Foundry"
cf target

# Deploy the application
echo "🚀 Deploying to Cloud Foundry..."
cf push

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app should be available at the URL shown above"
else
    echo "❌ Deployment failed. Check the logs above for details."
    exit 1
fi
