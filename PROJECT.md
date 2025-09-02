# Project Instructions: [PROJECT NAME]

> **Instructions for the User**:

You are an expert in UI design and Spring Programming. We curently have a project at ../insurance-megacorp/imc-manager that has a unique UI design that we
want to generalize.  We want the exact same layout of icon tool bar on left , title at top, and we will want a main page with our diagram  in the display pane.  We will have 3 icons on left (main page, construction icon 1, construction icon 2) the main page icon brings you to the defautl display which is JUST a flow diagram. (ask me for pictures).  the other to will take you to displays that say COming soon or something. What we want to do is take the look and feel of the dataflow diagram and externalize the config into a JSON file that lets us give an name, icon, description, then 2 Keys and 2 API endpoints to get the 2 values (these are in the grid).  Then we need someway to define what the item connects to on its left or from above (if we choose vertical layout), and whether we want a solid or dashed line, and if the line has particles moving (either one way or bidirectionally).).... there should be a config section at top that lets us define horizontal or vertical layout.

---

## 1. Project Overview & Goal

*   **What is the primary goal of this project?**
    *   The Purpose is to give the user a platform to quickly build dataflow diagrams
*   **Who are the end-users?**
    *  Demo Developers

## 2. Tech Stack

*   **Language(s) & Version(s)**: Java 21, Spring Boot 3.5.5, REact 18+, NodeJS, TypeScript + Vite
*   **Key Libraries**: 
*   **Build/Package Manager**: Maven, Git (Remote is https://github.com/dbbaskette/diagram-designer)

## 3. Architecture & Design

*   **Directory Structure**: Briefly describe the purpose of key directories.
    *   `src/main/java/com/baskettecase/diagramdesigner/`: Main application source
    *   `src/main/resources/`: Configuration files
    *   `docs/`: Project documentation

## 4. Coding Standards & Conventions

*   **Code Style**: Google Java Style Guide, Sprin Best Practice
*   **Naming Conventions**: Use `camelCase` for variables", "Services should be suffixed with `Service`"
*   **API Design**: "RESTful, follow standard HTTP verbs"
*   **Error Handling**: "Use custom exception classes", "Return standardized JSON error responses"

## 5. Important "Do's and Don'ts"

*   **DO**: "Write unit tests for all new business logic."
*   **DON'T**:  "Do not commit secrets or API keys directly into the repository."
*   **DO**: ( "Log important events and errors."


{
  "config": {
    "layout": "horizontal",
    "updateInterval": 30000,
    "title": "System Architecture Diagram"
  },
  "nodes": [
    {
      "name": "WebServer-01",
      "displayName": "Web Server",
      "description": "Handles incoming HTTP requests from clients and serves static content.",
      "icon": "fas fa-server",
      "dataGrid": [
        {
          "label": "Traffic",
          "key": "xyz-apikey-for-webserver",
          "url": "https://monitoring.example.com/api/v1/webtraffic",
          "valueField": "requestsPerSecond"
        },
        {
          "label": "CPU Utilization",
          "key": "bearer-token-secret-123",
          "url": "https://metrics.example.com/api/v1/metrics",
          "valueField": "cpuUtilization"
        }
      ],
      "connectTo": ["APIServer-Main", "LoadBalancer-Primary"],
      "lineType": "dashed",
      "lineColor": "#3498db",
      "particles": {
        "enabled": true,
        "speed": 2,
        "density": 150,
        "color": "#3498db"
      }
    },
    {
      "name": "APIServer-Main",
      "displayName": "API Server",
      "description": "Processes business logic and interacts with the database.",
      "icon": "fas fa-cogs",
      "dataGrid": [
        {
          "label": "Transactions",
          "key": "abc-apikey-for-apiserver",
          "url": "https://api.example.com/api/v2/transactions/count",
          "valueField": "totalTransactions"
        },
        {
          "label": "Latency",
          "key": "session-key-secret-456",
          "url": "https://api.example.com/api/v2/performance",
          "valueField": "averageLatencyMs"
        }
      ],
      "connectTo": ["Database-Primary"],
      "lineType": "solid",
      "lineColor": "#2ecc71",
      "particles": {
        "enabled": false
      }
    },
    {
      "name": "Database-Primary",
      "displayName": "Primary Database",
      "description": "Persistent storage for all application data.",
      "icon": "fas fa-database",
      "dataGrid": [
        {
          "label": "Active Connections",
          "key": "dbUser:admin_user",
          "url": "https://db.example.com/db/status/connections",
          "valueField": "activeConnections"
        },
        {
          "label": "Storage Size (GB)",
          "key": "dbPass:super-secret-password-789",
          "url": "https://db.example.com/db/status/storage",
          "valueField": "diskSizeGb"
        }
      ],
      "connectTo": [],
      "lineType": "solid",
      "lineColor": "#e74c3c",
      "particles": {
        "enabled": true,
        "speed": 1,
        "density": 100,
        "color": "#e74c3c"
      }
    }
  ]
}