package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.MetricsProxyService;
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

    @Autowired
    public MetricsProxyController(MetricsProxyService metricsProxyService) {
        this.metricsProxyService = metricsProxyService;
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

        // Basic URL validation
        if (!isValidUrl(targetUrl)) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid URL format")));
        }

        return metricsProxyService.proxyRequest(targetUrl, nodeName);
    }

    @GetMapping("/list-diagrams")
    public ResponseEntity<Object> listDiagrams() {
        // In a real implementation, you might read from a database or file system
        // For now, return a simple list of available diagram files
        return ResponseEntity.ok(Map.of(
                "diagrams", new String[]{
                        "diagram-config.json",
                        "Telemetry-Processing.json",
                        "IMC-chatbot.json"
                }
        ));
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