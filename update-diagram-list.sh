#!/bin/bash

# Script to automatically update the diagram list by scanning the public directory
# This ensures the list-diagrams.json file stays in sync with actual files

echo "🔍 Scanning for diagram files in frontend/public/..."

# Find all JSON files in the public directory, excluding the list file itself
DIAGRAM_FILES=$(find frontend/public -name "*.json" -not -name "list-diagrams.json" -not -path "*/api/*" | sed 's|frontend/public/||' | sort)

# Convert to JSON array format
JSON_ARRAY="["
FIRST=true
for file in $DIAGRAM_FILES; do
    if [ "$FIRST" = true ]; then
        JSON_ARRAY="${JSON_ARRAY}\"${file}\""
        FIRST=false
    else
        JSON_ARRAY="${JSON_ARRAY},\"${file}\""
    fi
done
JSON_ARRAY="${JSON_ARRAY}]"

# Write to the API endpoint file
echo "$JSON_ARRAY" > frontend/public/api/list-diagrams.json

echo "✅ Updated diagram list:"
echo "$JSON_ARRAY" | jq .
echo ""
echo "📁 Files found:"
for file in $DIAGRAM_FILES; do
    echo "  - $file"
done
