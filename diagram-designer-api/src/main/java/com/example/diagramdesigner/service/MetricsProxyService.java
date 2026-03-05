package com.example.diagramdesigner.service;

import com.example.diagramdesigner.config.MetricsProxyProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class MetricsProxyService {

    private static final Logger logger = LoggerFactory.getLogger(MetricsProxyService.class);
    private static final int DEFAULT_MAX_CACHE_SIZE = 256;

    private final WebClient webClient;
    private final MetricsProxyProperties properties;
    private final ObjectMapper objectMapper;
    private final AuthenticationResolver authenticationResolver;

    private final Cache<String, Object> cache;
    private final ConcurrentMap<String, Mono<Object>> inFlight = new ConcurrentHashMap<>();

    @Autowired
    public MetricsProxyService(MetricsProxyProperties properties, ObjectMapper objectMapper,
            AuthenticationResolver authenticationResolver) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.authenticationResolver = authenticationResolver;
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024)) // 1MB
                .build();
        this.cache = Caffeine.newBuilder()
                .maximumSize(properties.getCacheMaxSize() > 0 ? properties.getCacheMaxSize() : DEFAULT_MAX_CACHE_SIZE)
                .expireAfterWrite(Duration.ofMillis(properties.getCacheTtlMs()))
                .build();
    }

    public Mono<ResponseEntity<Object>> proxyRequest(String targetUrl, String nodeName) {
        logger.debug("Proxying request to: {} (node: {})", targetUrl, nodeName);

        String authFingerprint = authenticationResolver.getAuthFingerprint(targetUrl, nodeName);
        String cacheKey = buildCacheKey(targetUrl, nodeName, authFingerprint);

        // Check cache first
        if (properties.isEnableCaching()) {
            Object cached = cache.getIfPresent(cacheKey);
            if (cached != null) {
                logger.debug("Returning cached response for: {} (key: {})", targetUrl, cacheKey);
                return Mono.just(ResponseEntity.ok(cached));
            }
        }

        // Deduplicate in-flight requests for the same cache key
        Mono<Object> shared = inFlight.computeIfAbsent(cacheKey, k ->
                makeAuthenticatedRequest(targetUrl, nodeName)
                        .doOnNext(response -> {
                            if (properties.isEnableCaching()) {
                                cache.put(cacheKey, response);
                            }
                        })
                        .doFinally(signal -> inFlight.remove(cacheKey))
                        .cache()
        );

        return shared
                .map(ResponseEntity::ok)
                .onErrorResume(this::handleError);
    }

    public Mono<Map<String, Object>> getBatchMetrics(java.util.List<Map<String, String>> requests) {
        return reactor.core.publisher.Flux.fromIterable(requests)
                .flatMap(req -> {
                    String url = req.get("url");
                    String node = req.get("node");
                    String key = req.getOrDefault("key", url); // Use URL as key if no specific key provided

                    if (url == null)
                        return Mono.empty();

                    return proxyRequest(url, node)
                            .map(response -> {
                                Object body = response.getBody();
                                return Map.of(key, body != null ? body : Map.of("error", "Empty response"));
                            })
                            .onErrorResume(e -> Mono.just(Map.of(key, Map.of("error", e.getMessage()))));
                })
                .collect(java.util.stream.Collectors.toMap(
                        m -> m.keySet().iterator().next(),
                        m -> m.values().iterator().next()));
    }

    String buildCacheKey(String targetUrl, String nodeName, String authFingerprint) {
        return targetUrl + "\0" + (nodeName != null ? nodeName : "")
                + "\0" + (authFingerprint != null ? authFingerprint : "");
    }

    Mono<Object> makeAuthenticatedRequest(String targetUrl, String nodeName) {
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
                            "message", error.getMessage() != null ? error.getMessage() : "Network error")));
        }
    }
}
