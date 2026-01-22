# Diagram Designer - Improvement Recommendations

## Overview

This document outlines recommended improvements for the diagram-designer codebase across security, performance, code quality, testing, and architecture.

---

## 1. Security Concerns

### 1.1 CORS Configuration ~~(HIGH Priority)~~ COMPLETED

**Status:** Implemented in `CorsConfig.java`

**Solution:** Created global CORS configuration with configurable origins via `CORS_ALLOWED_ORIGINS` environment variable. Removed `@CrossOrigin(origins = "*")` from all controllers.

### 1.2 SSRF Prevention ~~(HIGH Priority)~~ COMPLETED

**Status:** Implemented in `MetricsProxyController.java`

**Solution:** Added `isPrivateOrLocalAddress()` method that blocks:
- localhost, 127.0.0.0/8, ::1
- 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (private ranges)
- 169.254.0.0/16 (link-local)
- Unresolvable hostnames (blocked by default)

### 1.3 Batch Request Size Limit ~~(HIGH Priority)~~ COMPLETED

**Status:** Implemented in `MetricsProxyController.java`

**Solution:** Added `MAX_BATCH_SIZE = 100` constant with validation that returns 400 Bad Request if exceeded.

### 1.4 Debug Endpoint Protection (MEDIUM Priority)

**File:** `MetricsProxyController.java:118-135`

**Issue:** Debug endpoint exposes `VCAP_SERVICES` containing credentials.

**Recommendation:** Add security annotation or remove in production:
```java
@GetMapping("/debug/vcap-services")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Map<String, Object>> debugVcapServices() { }
```

---

## 2. Performance Improvements

### 2.1 Unbounded Cache Growth (HIGH Priority)

**File:** `DiagramController.java:205`

**Issue:** `configCache` is unbounded ConcurrentHashMap with no eviction.

**Recommendation:** Replace with Caffeine cache:
```java
private final Cache<String, CachedConfig> configCache = Caffeine.newBuilder()
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .maximumSize(1000)
    .build();
```

### 2.2 Service Discovery Cache TTL (MEDIUM Priority)

**File:** `ServiceDiscovery.java:30-31`

**Issue:** Service URL cache has no TTL - stale entries if services move.

**Recommendation:**
```java
private final Cache<String, String> serviceUrlCache = Caffeine.newBuilder()
    .expireAfterWrite(5, TimeUnit.MINUTES)
    .build();
```

### 2.3 Metrics Polling Optimization (LOW Priority)

**File:** `MetricsContext.tsx:72-73`

**Issue:** Polls every 30 seconds regardless of registered metrics.

**Recommendation:** Skip polling when no metrics registered:
```typescript
if (currentRequests.size === 0) return;
```

---

## 3. Code Quality

### 3.1 Input Validation (HIGH Priority)

**File:** `DiagramController.java:93-95`

**Issue:** Filename regex too permissive for path traversal prevention.

**Recommendation:** Validate against whitelist:
```java
List<String> allowed = listDiagrams().getBody();
if (!allowed.contains(filename)) {
    return ResponseEntity.forbidden().build();
}
```

### 3.2 JSON Injection Prevention (MEDIUM Priority)

**File:** `ConfigurationProcessor.java:97-136`

**Issue:** Variable substitution doesn't sanitize values before JSON insertion.

**Recommendation:** Escape values:
```java
String escapedValue = objectMapper.writeValueAsString(value);
// Remove surrounding quotes added by writeValueAsString
escapedValue = escapedValue.substring(1, escapedValue.length() - 1);
```

### 3.3 Error Handling Consistency (MEDIUM Priority)

**File:** `nodeDetailsService.ts:35-65`

**Issue:** Returns `null` for both 404 (expected) and errors (unexpected).

**Recommendation:**
```typescript
if (response.status === 404) {
    return null; // Expected - no custom config
}
if (!response.ok) {
    throw new Error(`HTTP ${response.status}`); // Unexpected
}
```

### 3.4 Hardcoded File List (LOW Priority)

**File:** `DiagramController.java:66-68`

**Issue:** Hardcoded filenames for JAR deployment.

**Recommendation:** Use Spring's `ResourcePatternResolver` to scan classpath dynamically.

---

## 4. Testing Gaps

### 4.1 Missing Test Suite (HIGH Priority)

**Issue:** No unit or integration tests exist in the codebase.

**Recommended Test Structure:**
```
diagram-designer-api/src/test/java/
├── service/
│   ├── AuthenticationResolverTest.java
│   ├── ConfigurationProcessorTest.java
│   ├── MetricsProxyServiceTest.java
│   └── ServiceDiscoveryTest.java
└── controller/
    ├── DiagramControllerTest.java
    └── MetricsProxyControllerTest.java

frontend/src/__tests__/
├── components/
│   ├── DiagramView.test.tsx
│   └── CustomNode.test.tsx
└── context/
    └── MetricsContext.test.tsx
```

### 4.2 Priority Test Cases

| Service | Critical Test Cases |
|---------|-------------------|
| AuthenticationResolver | Credential resolution priority, cache behavior |
| ConfigurationProcessor | Variable substitution, special characters, defaults |
| MetricsProxyService | Cache hit/miss, timeout handling, batch aggregation |
| ServiceDiscovery | Fallback chain, VCAP parsing, cache expiration |

---

## 5. Architecture Improvements

### 5.1 Service Layer Extraction (MEDIUM Priority)

**File:** `DiagramController.java`

**Issue:** Controller handles caching, file I/O, and variable substitution (violates SRP).

**Recommendation:** Create service layer:
```java
@Service
public class DiagramConfigurationService {
    public DiagramConfig loadAndProcess(String filename) { }
    public List<String> listAvailableDiagrams() { }
}
```

### 5.2 Configuration Source Abstraction (LOW Priority)

**Issue:** Hardcoded classpath/filesystem access.

**Recommendation:**
```java
public interface ConfigurationSource {
    List<String> listConfigs();
    String readConfig(String name);
}
// Implementations: Filesystem, Classpath, Database
```

### 5.3 Custom Hook Extraction (LOW Priority)

**File:** `CustomNode.tsx`

**Issue:** Component manages metric fetching and UI rendering.

**Recommendation:**
```typescript
const useNodeMetrics = (node: DiagramNode) => {
    const { registerMetric } = useMetrics();
    // Move metric logic here
    return { metrics, status, error };
};
```

---

## 6. Documentation Gaps

### 6.1 Environment Variables (HIGH Priority)

**Missing:** No documentation of required `VITE_*` variables.

**Recommendation:** Create `.env.example`:
```bash
VITE_API_URL=http://localhost:3001
VITE_LOG_LEVEL=debug  # debug|info|warn|error
VITE_ENABLE_MOCK_DATA=false
```

### 6.2 Service Documentation (MEDIUM Priority)

**Files needing JSDoc/JavaDoc:**
- `MetricsProxyService.java` - Cache strategy, TTL, batch behavior
- `AuthenticationResolver.java` - Resolution priority flowchart
- `ServiceDiscovery.java` - Discovery fallback chain

---

## 7. Quick Wins

| Priority | Task | File | Est. Time |
|----------|------|------|-----------|
| HIGH | Add batch size limit | MetricsProxyController.java | 15 min |
| HIGH | Block private IPs | MetricsProxyController.java | 30 min |
| MEDIUM | Replace unbounded caches | DiagramController.java | 45 min |
| MEDIUM | Extract constants | Multiple files | 30 min |
| MEDIUM | Protect debug endpoints | MetricsProxyController.java | 20 min |
| LOW | Create .env.example | Project root | 15 min |
| LOW | Add graceful shutdown | application.yml | 10 min |

---

## 8. Implementation Phases

### Phase 1: Security Hardening (1-2 weeks)
- SSRF prevention
- CORS configuration
- Input validation
- Credential logging fixes

### Phase 2: Core Quality (2-3 weeks)
- Unit test suite for services
- Service layer refactoring
- Error handling improvements
- Cache improvements with Caffeine

### Phase 3: Polish (3-4 weeks)
- Frontend component tests
- Integration tests
- Documentation updates
- Performance optimization

---

## 9. Dependencies to Add

### Backend (pom.xml)
```xml
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

### Frontend (package.json)
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "vitest": "^1.0.0",
    "zod": "^3.22.0"
  }
}
```

---

## 10. Feature Enhancements (Future)

### 10.1 Real-Time Collaboration
Enable multiple users to view/edit diagrams simultaneously using WebSockets (STOMP).

### 10.2 Diagram Versioning
Store configuration versions in a database with rollback capability.

### 10.3 Export Improvements
Add PDF export alongside existing PNG export.

### 10.4 Template Library Expansion
Add more pre-defined templates (Event-Driven, Data Pipeline, etc.).
