package com.example.diagramdesigner.service;

import com.example.diagramdesigner.config.MetricsProxyProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MetricsProxyService {

    private static final Logger logger = LoggerFactory.getLogger(MetricsProxyService.class);

    private final WebClient webClient;
    private final MetricsProxyProperties properties;
    private final ObjectMapper objectMapper;
    private final AuthenticationResolver authenticationResolver;

    // Simple in-memory cache
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    @Autowired
    public MetricsProxyService(MetricsProxyProperties properties, ObjectMapper objectMapper,
                              AuthenticationResolver authenticationResolver) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.authenticationResolver = authenticationResolver;
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024)) // 1MB
                .build();
    }

    public Mono<ResponseEntity<Object>> proxyRequest(String targetUrl) {
        return proxyRequest(targetUrl, null);
    }

    public Mono<ResponseEntity<Object>> proxyRequest(String targetUrl, String nodeName) {
        logger.debug("Proxying request to: {} (node: {})", targetUrl, nodeName);

        // Check cache first
        if (properties.isEnableCaching()) {
            CacheEntry cached = cache.get(targetUrl);
            if (cached != null && !cached.isExpired()) {
                logger.debug("Returning cached response for: {}", targetUrl);
                return Mono.just(ResponseEntity.ok(cached.getData()));
            }
        }

        return makeAuthenticatedRequest(targetUrl, nodeName)
                .map(response -> {
                    // Cache the response if enabled
                    if (properties.isEnableCaching()) {
                        cache.put(targetUrl, new CacheEntry(response, properties.getCacheTtlMs()));
                    }
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(this::handleError);
    }

    private Mono<Object> makeAuthenticatedRequest(String targetUrl) {
        return makeAuthenticatedRequest(targetUrl, null);
    }

    private Mono<Object> makeAuthenticatedRequest(String targetUrl, String nodeName) {
        try {
            // Build the request with authentication
            WebClient.RequestHeadersSpec<?> request = webClient.get()
                    .uri(targetUrl)
                    .headers(headers -> authenticationResolver.addAuthenticationHeaders(headers, targetUrl, nodeName))
                    .headers(headers -> headers.add("User-Agent", "Diagram-Designer-Proxy/1.0"));

            return request.retrieve()
                    .bodyToMono(Object.class)
                    .timeout(Duration.ofMillis(properties.getTimeoutMs()));

        } catch (Exception e) {
            logger.error("Error creating request for URL: {}", targetUrl, e);
            return Mono.error(new RuntimeException("Invalid URL: " + targetUrl, e));
        }
    }


    private Mono<ResponseEntity<Object>> handleError(Throwable error) {
        if (error instanceof WebClientResponseException wcre) {
            logger.warn("HTTP error from upstream service: {} {}", wcre.getStatusCode(), wcre.getMessage());

            try {
                Object errorBody = objectMapper.readValue(wcre.getResponseBodyAsString(), Object.class);
                return Mono.just(ResponseEntity.status(wcre.getStatusCode()).body(errorBody));
            } catch (Exception e) {
                // If we can't parse the error body, return a generic error
                return Mono.just(ResponseEntity.status(wcre.getStatusCode())
                        .body(Map.of("error", "Upstream service error", "status", wcre.getStatusCode().value())));
            }
        } else {
            logger.error("Unexpected error in metrics proxy", error);
            return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error", "Service unavailable",
                            "message", error.getMessage() != null ? error.getMessage() : "Network error"
                    )));
        }
    }

    // Clean up expired cache entries periodically
    public void cleanupCache() {
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    private static class CacheEntry {
        private final Object data;
        private final long expiry;

        public CacheEntry(Object data, long ttlMs) {
            this.data = data;
            this.expiry = System.currentTimeMillis() + ttlMs;
        }

        public Object getData() {
            return data;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiry;
        }
    }
}