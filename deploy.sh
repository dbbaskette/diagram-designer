#!/bin/bash
# deploy.sh - Unified deploy script for Diagram Designer
#
# Usage:
#   ./deploy.sh              Deploy to Cloud Foundry (default)
#   ./deploy.sh --cf         Deploy to Cloud Foundry
#   ./deploy.sh --prod       Build and run production JAR locally on :8080
#   ./deploy.sh --local      Run dev servers (Spring Boot :3001 + Vite :5173)
#   ./deploy.sh --help       Show this help

set -e

MODE="cf"
case "${1:-}" in
    --local|local)   MODE="local" ;;
    --prod|prod)     MODE="prod" ;;
    --cf|cf|"")      MODE="cf" ;;
    -h|--help|help)
        sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        echo "Usage: $0 [--local|--prod|--cf]"
        exit 1
        ;;
esac

require() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 not found. $2"
        exit 1
    fi
}

require mvn  "Install Maven: https://maven.apache.org/install.html"
require java "Install Java 21+."
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | awk -F '.' '{print $1}')
[ "$JAVA_VERSION" -lt 21 ] && echo "⚠️  Java 21 recommended (current: $JAVA_VERSION)"

if [ ! -f "pom.xml" ] || [ ! -d "frontend" ] || [ ! -d "diagram-designer-api" ]; then
    echo "❌ Run from the project root directory."
    exit 1
fi

if [ -f ".config.env" ]; then
    echo "📝 Loading .config.env"
    set -a; source .config.env; set +a
elif [ -f ".config.env.template" ]; then
    echo "⚠️  No .config.env. For local builds: cp .config.env.template .config.env"
fi

case "$MODE" in
    local)
        echo "🚀 Local development mode"
        if [ ! -f "diagram-designer-api/src/main/resources/application-local.yml" ]; then
            cat > diagram-designer-api/src/main/resources/application-local.yml <<'EOF'
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
EOF
        fi

        [ ! -d "frontend/node_modules" ] && (cd frontend && npm install)

        mvn compile -q

        cleanup() {
            echo "🛑 Stopping servers..."
            kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
            exit
        }
        trap cleanup INT TERM

        echo "📍 Frontend: http://localhost:5173"
        echo "📍 Backend:  http://localhost:3001"
        (cd diagram-designer-api && mvn spring-boot:run -Dspring-boot.run.profiles=dev) &
        BACKEND_PID=$!
        sleep 5
        (cd frontend && npm run dev) &
        FRONTEND_PID=$!
        wait $FRONTEND_PID $BACKEND_PID
        ;;

    prod)
        echo "🚀 Local production mode"
        mvn clean package -DskipTests
        echo "✅ App available at http://localhost:8080"
        cd diagram-designer-api
        java -jar target/diagram-designer-api-1.0.0.jar --spring.profiles.active=prod
        ;;

    cf)
        echo "🚀 Cloud Foundry deployment"
        require cf "Install: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"

        echo "🔧 Syncing configs..."
        cp configs/Telemetry-Processing.json diagram-designer-api/src/main/resources/static/configs/ 2>/dev/null || true
        mkdir -p diagram-designer-api/src/main/resources/static/configs/details
        cp configs/details/*.json diagram-designer-api/src/main/resources/static/configs/details/ 2>/dev/null || true
        cp configs/details/*.html diagram-designer-api/src/main/resources/static/configs/details/ 2>/dev/null || true

        echo "🧹 Clearing stale frontend assets..."
        rm -rf diagram-designer-api/src/main/resources/static/assets
        rm -f diagram-designer-api/src/main/resources/static/{index.html,manifest.json,vite.svg}

        mvn clean package -DskipTests

        if ! cf target > /dev/null 2>&1; then
            echo "❌ Not logged into CF. Run: cf login -a <api-endpoint>"
            exit 1
        fi
        cf target

        if [ -f ".config.env" ]; then
            echo "🔧 Setting CF env vars (auth-related only)..."
            while IFS= read -r line || [ -n "$line" ]; do
                [[ "$line" =~ ^[[:space:]]*# ]] && continue
                [[ -z "${line// }" ]] && continue
                if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                    key="${BASH_REMATCH[1]// /}"
                    value="${BASH_REMATCH[2]}"
                    if [[ "$key" =~ (USERNAME|PASSWORD|API_KEY|BEARER_TOKEN|CLIENT_ID|SECRET|TOKEN)$ ]]; then
                        cf set-env diagram-designer "$key" "$value" > /dev/null 2>&1 && echo "   $key"
                    fi
                fi
            done < ".config.env"
        fi

        echo "🚀 Pushing to CF..."
        cd diagram-designer-api
        cf push -f manifest.yml
        echo "✅ Deployment done. Logs: cf logs diagram-designer --recent"
        ;;
esac
