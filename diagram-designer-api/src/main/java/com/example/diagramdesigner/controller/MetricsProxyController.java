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

import java.net.InetAddress;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MetricsProxyController {

    private static final Logger logger = LoggerFactory.getLogger(MetricsProxyController.class);
    private static final int MAX_BATCH_SIZE = 100;

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
                "service", "diagram-designer-proxy"));
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

    @PostMapping("/metrics/batch")
    public Mono<ResponseEntity<Map<String, Object>>> proxyMetricsBatch(
            @RequestBody List<Map<String, String>> requests) {
        if (requests.size() > MAX_BATCH_SIZE) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(Map.of("error", "Batch size exceeds maximum of " + MAX_BATCH_SIZE)));
        }
        logger.debug("Received batch metrics request for {} items", requests.size());
        return metricsProxyService.getBatchMetrics(requests)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/list-diagrams")
    public ResponseEntity<Object> listDiagrams() {
        // Return a simple list of available diagram files
        // This could be expanded to scan the configs directory dynamically
        return ResponseEntity.ok(Map.of(
                "diagrams", new String[] {
                        "diagram-config.json",
                        "Telemetry-Processing.json"
                }));
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
                        "success", true));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                        "serviceName", serviceName,
                        "success", false,
                        "error", "Service not found in registry"));
            }
        } catch (Exception e) {
            logger.error("Error resolving service URL for: {}", serviceName, e);
            return ResponseEntity.status(500).body(Map.of(
                    "serviceName", serviceName,
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    @GetMapping("/debug/vcap-services")
    public ResponseEntity<Map<String, Object>> debugVcapServices() {
        try {
            String vcapServices = System.getenv("VCAP_SERVICES");
            if (vcapServices != null) {
                return ResponseEntity.ok(Map.of(
                        "vcap_services_present", true,
                        "vcap_services", vcapServices));
            } else {
                return ResponseEntity.ok(Map.of(
                        "vcap_services_present", false,
                        "message", "VCAP_SERVICES environment variable not found"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage()));
        }
    }

    private boolean isValidUrl(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            // Must have http or https scheme
            if (scheme == null || (!scheme.equals("http") && !scheme.equals("https"))) {
                return false;
            }

            // Must have a host
            if (host == null || host.isEmpty()) {
                return false;
            }

            // SSRF prevention: block private/internal IP ranges
            if (isPrivateOrLocalAddress(host)) {
                logger.warn("Blocked request to private/local address: {}", host);
                return false;
            }

            return true;
        } catch (Exception e) {
            logger.warn("Invalid URL provided: {}", url, e);
            return false;
        }
    }

    /**
     * Check if a hostname resolves to a private or local IP address.
     * Blocks: localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
     */
    private boolean isPrivateOrLocalAddress(String host) {
        try {
            // Check for obvious localhost patterns first
            if (host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1") || host.equals("::1")) {
                return true;
            }

            // Resolve hostname and check IP
            InetAddress address = InetAddress.getByName(host);
            return address.isLoopbackAddress()
                    || address.isSiteLocalAddress()
                    || address.isLinkLocalAddress()
                    || address.isAnyLocalAddress()
                    || isPrivateIPv4(address);
        } catch (Exception e) {
            // If we can't resolve the hostname, block it to be safe
            logger.warn("Could not resolve hostname for SSRF check: {}", host);
            return true;
        }
    }

    private boolean isPrivateIPv4(InetAddress address) {
        byte[] addr = address.getAddress();
        if (addr.length != 4) {
            return false; // Not IPv4
        }

        int firstOctet = addr[0] & 0xFF;
        int secondOctet = addr[1] & 0xFF;

        // 10.0.0.0/8
        if (firstOctet == 10) {
            return true;
        }
        // 172.16.0.0/12
        if (firstOctet == 172 && secondOctet >= 16 && secondOctet <= 31) {
            return true;
        }
        // 192.168.0.0/16
        if (firstOctet == 192 && secondOctet == 168) {
            return true;
        }
        // 169.254.0.0/16 (link-local)
        if (firstOctet == 169 && secondOctet == 254) {
            return true;
        }

        return false;
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

        // Generic pattern for service names: letters, numbers, hyphens, optionally
        // followed by a path
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
                        "message", e.getMessage() != null ? e.getMessage() : "An unexpected error occurred"));
    }
}