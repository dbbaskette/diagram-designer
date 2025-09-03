#!/bin/bash

# deploy-local.sh - Build and run the diagram designer locally
set -e

echo "🚀 Starting local deployment of Diagram Designer..."

# Change to frontend directory
cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building the application..."
npm run build

echo "🌐 Starting local development server..."
echo ""
echo "✅ Application will be available at:"
echo "   http://localhost:5173"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

# Start the development server
npm run dev
