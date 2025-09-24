# Configuration Guide

Complete guide for setting up and configuring the Diagram Designer system.

## Overview

The Diagram Designer uses a **flexible, secure configuration system** with these key features:

- ✅ **No hardcoded service assumptions** - works with any API
- ✅ **Dynamic authentication** - automatic credential matching
- ✅ **Variable substitution** - secure environment variable injection
- ✅ **Git-safe credentials** - sensitive data never committed

## Quick Start

### 1. Set Up Environment Configuration

```bash
# Copy the template
cp .config.env.template .config.env

# Edit with your credentials
nano .config.env
```

### 2. Add Your Service Credentials

```bash
# Example .config.env file
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=secret123
MONITORING_API_KEY=abc123xyz789
PROMETHEUS_BEARER_TOKEN=jwt_token_here
```

### 3. Use Variables in JSON Configs

```json
{
  "name": "message-queue",
  "url": "https://${RABBITMQ_HOSTNAME:rabbitmq.example.com}/management",
  "status": {
    "url": "https://${RABBITMQ_HOSTNAME}/api/overview"
  },
  "dataGrid": [
    {
      "label": "Queue Depth",
      "url": "https://${RABBITMQ_HOSTNAME}/api/queues"
    }
  ]
}
```

### 4. Start Development

```bash
./deploy-local.sh
# Your configs are now served with secure variable substitution!
```

---

## Authentication System

The system automatically detects and applies authentication based on environment variable patterns:

### 🔑 **Basic Authentication**
```bash
# Environment variables
SERVICE_USERNAME=myuser
SERVICE_PASSWORD=mypass

# Automatically creates: Authorization: Basic <base64>
```

### 🎫 **API Key Authentication**
```bash
# Environment variables
SERVICE_API_KEY=abc123

# Automatically creates: X-API-Key: abc123
# Or custom header: SERVICE_API_HEADER=X-Custom-Key
```

### 🎭 **Bearer Token**
```bash
# Environment variables
SERVICE_BEARER_TOKEN=jwt_token_here

# Automatically creates: Authorization: Bearer jwt_token_here
```

### 🔧 **Custom Headers**
```bash
# Environment variables
SERVICE_CLIENT_ID=client123
SERVICE_CLIENT_HEADER=X-Client-ID

# Automatically creates: X-Client-ID: client123
```

---

## Variable Substitution

Use environment variables directly in your JSON configuration files:

### Basic Syntax
```json
{
  "url": "https://${HOSTNAME}/api/metrics"
}
```

### With Default Values
```json
{
  "url": "https://${HOSTNAME:default.example.com}/api/metrics",
  "updateInterval": ${UPDATE_INTERVAL:30000}
}
```

### Hostname Matching
The system automatically matches credentials to services:

1. **Exact match**: `RABBITMQ_EXAMPLE_COM_USERNAME`
2. **Service prefix**: `RABBITMQ_USERNAME` (for rabbitmq.example.com)
3. **Common patterns**:
   - `rabbitmq.*` → `RABBITMQ_*` variables
   - `monitoring.*` → `MONITORING_*` variables
   - `api.*` → `API_*` variables
   - `prometheus.*` → `PROMETHEUS_*` variables

---

## File Structure

### 📁 **configs/** (Diagram JSON files)
- `configs/diagram-config.json` - Default diagram
- `configs/Telemetry-Processing.json` - Custom diagram example
- `configs/example-diagram-with-auth.json` - Full example

### ⚙️ **.config.env** (Local environment variables - git-ignored)
```bash
# Server Configuration
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev

# Service Credentials
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=secret123
MONITORING_API_KEY=abc123def456
```

### 📋 **.config.env.template** (Git-tracked template)
```bash
# Example configuration template
# Copy to .config.env and edit with your values

# RabbitMQ Service
# RABBITMQ_USERNAME=admin
# RABBITMQ_PASSWORD=secret123
# RABBITMQ_HOSTNAME=rabbitmq.example.com

# Monitoring API
# MONITORING_API_KEY=your_api_key
# MONITORING_HOSTNAME=monitoring.example.com
```

---

## Real-World Examples

### RabbitMQ Setup

**.config.env:**
```bash
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=secret123
RABBITMQ_HOSTNAME=rabbitmq.mycompany.com
```

**configs/my-rabbitmq-diagram.json:**
```json
{
  "config": {
    "title": "Message Queue System"
  },
  "nodes": [
    {
      "name": "message-queue",
      "displayName": "RabbitMQ",
      "icon": "🐰",
      "url": "https://${RABBITMQ_HOSTNAME}/management",
      "status": {
        "url": "https://${RABBITMQ_HOSTNAME}/api/overview",
        "valueField": "status",
        "upValue": "ok"
      },
      "dataGrid": [
        {
          "label": "Total Queues",
          "url": "https://${RABBITMQ_HOSTNAME}/api/queues",
          "valueField": "length"
        }
      ]
    }
  ]
}
```

### Prometheus Monitoring

**.config.env:**
```bash
PROMETHEUS_BEARER_TOKEN=eyJhbGc...
PROMETHEUS_HOSTNAME=prometheus.mycompany.com
```

**configs/monitoring-diagram.json:**
```json
{
  "nodes": [
    {
      "name": "metrics-server",
      "displayName": "Prometheus",
      "icon": "📊",
      "url": "https://${PROMETHEUS_HOSTNAME}",
      "dataGrid": [
        {
          "label": "CPU Usage",
          "url": "https://${PROMETHEUS_HOSTNAME}/api/v1/query?query=cpu_usage_percent",
          "valueField": "data.result[0].value[1]"
        }
      ]
    }
  ]
}
```

### Custom API with Client ID

**.config.env:**
```bash
MYAPI_CLIENT_ID=client_12345
MYAPI_CLIENT_HEADER=X-Client-ID
MYAPI_HOSTNAME=api.mycompany.com
```

**configs/custom-api-diagram.json:**
```json
{
  "nodes": [
    {
      "name": "custom-service",
      "displayName": "Custom API",
      "dataGrid": [
        {
          "label": "Request Rate",
          "url": "https://${MYAPI_HOSTNAME}/v1/metrics/requests",
          "valueField": "requests_per_second"
        }
      ]
    }
  ]
}
```

---

## Deployment

### Local Development
```bash
# Configuration loaded from .config.env
./deploy-local.sh
```

### Production (Cloud Foundry)
```bash
# Set variables in CF environment
cf set-env diagram-designer RABBITMQ_USERNAME "prod_user"
cf set-env diagram-designer RABBITMQ_PASSWORD "prod_password"
cf set-env diagram-designer MONITORING_API_KEY "prod_key"

# Deploy
./deploy.sh
```

---

## Security Best Practices

1. **Never commit `.config.env`** - it's git-ignored by default
2. **Use different credentials** for dev/staging/prod environments
3. **Rotate credentials regularly** - just update `.config.env` and restart
4. **Use least-privilege access** - create service accounts with minimal permissions
5. **Monitor access logs** - track API usage through the proxy

---

## Troubleshooting

### Variables Not Substituting
- ✅ Check variable names are UPPERCASE with underscores
- ✅ Verify the variable is set: `echo $VARIABLE_NAME`
- ✅ Check Spring Boot logs for substitution messages

### Authentication Not Working
- ✅ Verify environment variables in application logs
- ✅ Test manually: `curl -H "X-API-Key: $API_KEY" https://api.example.com/test`
- ✅ Check hostname matching patterns

### JSON Syntax Errors
- ✅ Validate JSON after variable substitution
- ✅ Check processed JSON in browser dev tools
- ✅ Use default values: `${VAR:default}` to prevent empty values

---

## Migration from Old System

If upgrading from previous versions:

1. **Extract credentials** to `.config.env`
2. **Replace hardcoded values** with `${VARIABLE}` syntax
3. **Remove `key` fields** from JSON (authentication is now automatic)
4. **Move JSON files** from `frontend/public/` to `configs/`
5. **Test locally** before deploying