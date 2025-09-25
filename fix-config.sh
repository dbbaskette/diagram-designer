#!/bin/bash
# Fix configuration file with text properties after Maven build

echo "🔧 Fixing configuration files with text properties..."

# Copy the correct source config to the static directory (served to browser)
cp "/Users/dbbaskette/Projects/diagram-designer/configs/Telemetry-Processing.json" "/Users/dbbaskette/Projects/diagram-designer/diagram-designer-api/target/classes/static/configs/"

# Optional: Also copy to resources directory for consistency (though frontend doesn't use this)
cp "/Users/dbbaskette/Projects/diagram-designer/configs/Telemetry-Processing.json" "/Users/dbbaskette/Projects/diagram-designer/diagram-designer-api/target/classes/configs/"

echo "✅ Configuration files updated with text properties"

# Verify the text properties are present
if grep -q '"text"' "/Users/dbbaskette/Projects/diagram-designer/diagram-designer-api/target/classes/static/configs/Telemetry-Processing.json"; then
    echo "✅ Text properties confirmed in static config"
else
    echo "❌ Text properties missing in static config"
fi