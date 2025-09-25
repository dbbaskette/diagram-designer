package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.MetricsProxyService;
import com.example.diagramdesigner.service.ServiceDiscovery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow CORS for all origins in development
public class MetricsProxyController {

    private static final Logger logger = LoggerFactory.getLogger(MetricsProxyController.class);

    private final MetricsProxyService metricsProxyService;
    private final ServiceDiscovery serviceDiscovery;

    @Autowired
    public MetricsProxyController(MetricsProxyService metricsProxyService, ServiceDiscovery serviceDiscovery) {
        this.metricsProxyService = metricsProxyService;
        this.serviceDiscovery = serviceDiscovery;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "timestamp", System.currentTimeMillis(),
                "service", "diagram-designer-proxy"
        ));
    }

    @GetMapping("/metrics")
    public Mono<ResponseEntity<Object>> proxyMetrics(
            @RequestParam("url") String targetUrl,
            @RequestParam(value = "node", required = false) String nodeName) {
        logger.info("Received metrics proxy request for URL: {} (node: {})", targetUrl, nodeName);

        if (!StringUtils.hasText(targetUrl)) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(Map.of("error", "URL parameter is required")));
        }

        String resolvedUrl = targetUrl;

        // Check if this is a service name that needs resolution
        if (!isValidUrl(targetUrl)) {
            // This might be a service name - try to resolve it
            if (isServiceName(targetUrl)) {
                logger.info("Detected service name pattern: {}, attempting to resolve", targetUrl);
                resolvedUrl = resolveServiceUrl(targetUrl);
                if (resolvedUrl == null) {
                    return Mono.just(ResponseEntity.status(404)
                            .body(Map.of("error", "Service not found in registry: " + targetUrl)));
                }
                logger.info("Resolved service {} to URL: {}", targetUrl, resolvedUrl);
            } else {
                return Mono.just(ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid URL format and not a recognized service name: " + targetUrl)));
            }
        }

        return metricsProxyService.proxyRequest(resolvedUrl, nodeName);
    }

    @GetMapping("/list-diagrams")
    public ResponseEntity<Object> listDiagrams() {
        // Return a simple list of available diagram files
        // This could be expanded to scan the configs directory dynamically
        return ResponseEntity.ok(Map.of(
                "diagrams", new String[]{
                        "diagram-config.json",
                        "Telemetry-Processing.json"
                }
        ));
    }

    @GetMapping("/service-url/{serviceName}")
    public ResponseEntity<Map<String, Object>> getServiceUrl(@PathVariable String serviceName) {
        logger.info("Resolving service URL for: {}", serviceName);

        try {
            String serviceUrl = serviceDiscovery.discoverServiceUrl(serviceName);

            if (serviceUrl != null) {
                return ResponseEntity.ok(Map.of(
                        "serviceName", serviceName,
                        "serviceUrl", serviceUrl,
                        "success", true
                ));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                        "serviceName", serviceName,
                        "success", false,
                        "error", "Service not found in registry"
                ));
            }
        } catch (Exception e) {
            logger.error("Error resolving service URL for: {}", serviceName, e);
            return ResponseEntity.status(500).body(Map.of(
                    "serviceName", serviceName,
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/debug/vcap-services")
    public ResponseEntity<Map<String, Object>> debugVcapServices() {
        try {
            String vcapServices = System.getenv("VCAP_SERVICES");
            if (vcapServices != null) {
                return ResponseEntity.ok(Map.of(
                        "vcap_services_present", true,
                        "vcap_services", vcapServices
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                        "vcap_services_present", false,
                        "message", "VCAP_SERVICES environment variable not found"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage()
            ));
        }
    }

    private boolean isValidUrl(String url) {
        try {
            java.net.URI uri = java.net.URI.create(url);
            return uri.getScheme() != null && (uri.getScheme().equals("http") || uri.getScheme().equals("https"));
        } catch (Exception e) {
            logger.warn("Invalid URL provided: {}", url, e);
            return false;
        }
    }

    private boolean isServiceName(String input) {
        // Check if this looks like a service name format
        // Service names typically:
        // - Don't start with http:// or https:// (those are full URLs)
        // - May have a path after the service name
        // - Match pattern: service-name or service-name/path

        if (input.startsWith("http://") || input.startsWith("https://")) {
            return false;
        }

        // Generic pattern for service names: letters, numbers, hyphens, optionally followed by a path
        return input.matches("^[a-zA-Z0-9-]+(/.*)?$");
    }

    private String resolveServiceUrl(String serviceInput) {
        try {
            // Extract service name from input like "imc-db-server/api/db01/fleet/summary"
            String serviceName;
            String remainingPath = "";

            if (serviceInput.contains("/")) {
                String[] parts = serviceInput.split("/", 2);
                serviceName = parts[0];
                remainingPath = "/" + parts[1];
            } else {
                serviceName = serviceInput;
            }

            logger.debug("Attempting to resolve service: {} with path: {}", serviceName, remainingPath);

            String baseUrl = serviceDiscovery.discoverServiceUrl(serviceName);
            if (baseUrl != null) {
                // Ensure baseUrl doesn't end with "/" to avoid double slashes
                if (baseUrl.endsWith("/")) {
                    baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
                }
                return baseUrl + remainingPath;
            }

            return null;
        } catch (Exception e) {
            logger.error("Error resolving service URL for input: {}", serviceInput, e);
            return null;
        }
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        logger.error("Unexpected error in metrics proxy controller", e);
        return ResponseEntity.internalServerError()
                .body(Map.of(
                        "error", "Internal server error",
                        "message", e.getMessage() != null ? e.getMessage() : "An unexpected error occurred"
                ));
    }
}