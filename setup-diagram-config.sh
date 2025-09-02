#!/bin/bash

# Setup script for diagram configuration
# This script copies the template to create the actual config file

echo "Setting up diagram configuration..."

# Check if template exists
if [ ! -f "frontend/public/diagram-config-template.json" ]; then
    echo "Error: Template file not found!"
    exit 1
fi

# Check if actual config already exists
if [ -f "frontend/public/diagram-config.json" ]; then
    echo "Warning: diagram-config.json already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy template to actual config
cp "frontend/public/diagram-config-template.json" "frontend/public/diagram-config.json"

echo "✅ diagram-config.json created from template!"
echo ""
echo "Next steps:"
echo "1. Edit frontend/public/diagram-config.json with your actual configuration"
echo "2. Add your API keys, URLs, and sensitive data"
echo "3. Customize nodes, connections, and styling"
echo "4. The actual config file is excluded from git (contains sensitive data)"
echo "5. The template file is included in git for reference"
echo ""
echo "📖 See frontend/public/diagram-config-documentation.md for detailed options"
