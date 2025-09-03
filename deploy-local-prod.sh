#!/bin/bash

# deploy-local-prod.sh - Build and serve the diagram designer in production mode locally
set -e

echo "🚀 Starting local production deployment of Diagram Designer..."

# Change to frontend directory
cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building the application for production..."
npm run build

echo "🌐 Starting local production server..."
echo ""
echo "✅ Application will be available at:"
echo "   http://localhost:4173"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

# Start the preview server (serves the built dist folder)
npm run preview
