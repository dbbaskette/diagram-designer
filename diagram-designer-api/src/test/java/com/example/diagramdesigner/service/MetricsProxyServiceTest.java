package com.example.diagramdesigner.service;

import com.example.diagramdesigner.config.MetricsProxyProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.concurrent.ConcurrentMap;

import reactor.core.publisher.Mono;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MetricsProxyServiceTest {

    private MetricsProxyProperties properties;
    private ObjectMapper objectMapper;
    private AuthenticationResolver authResolver;
    private MetricsProxyService service;

    @BeforeEach
    void setUp() {
        properties = new MetricsProxyProperties();
        properties.setEnableCaching(true);
        properties.setCacheTtlMs(30000);
        properties.setCacheMaxSize(256);
        properties.setTimeoutMs(5000);
        objectMapper = new ObjectMapper();
        authResolver = mock(AuthenticationResolver.class);
        service = new MetricsProxyService(properties, objectMapper, authResolver);
    }

    @Test
    void cacheKeyIncludesNodeName() {
        String key1 = service.buildCacheKey("http://host/metrics", "node-a");
        String key2 = service.buildCacheKey("http://host/metrics", "node-b");
        String key3 = service.buildCacheKey("http://host/metrics", null);

        assertNotEquals(key1, key2, "Same URL with different nodes should produce different keys");
        assertNotEquals(key1, key3, "Keyed vs null-node should differ");
        assertEquals(key1, service.buildCacheKey("http://host/metrics", "node-a"),
                "Same URL+node should produce the same key");
    }

    @Test
    void sameUrlDifferentNodeProducesDifferentCacheKeys() {
        String url = "http://shared-host/metrics";
        String keyA = service.buildCacheKey(url, "node-a");
        String keyB = service.buildCacheKey(url, "node-b");

        assertNotEquals(keyA, keyB,
                "Cache keys for same URL but different nodes must differ");
    }

    @Test
    void buildCacheKeyHandlesNullNode() {
        String key = service.buildCacheKey("http://example.com/api", null);
        assertEquals("http://example.com/api|", key);
    }

    @Test
    void buildCacheKeyWithNode() {
        String key = service.buildCacheKey("http://example.com/api", "rabbitmq-1");
        assertEquals("http://example.com/api|rabbitmq-1", key);
    }

    @Test
    void sameUrlSameNodeProducesSameCacheKey() {
        String key1 = service.buildCacheKey("http://example.com/api", "node-x");
        String key2 = service.buildCacheKey("http://example.com/api", "node-x");
        assertEquals(key1, key2);
    }

    @SuppressWarnings("unchecked")
    @Test
    void inFlightMapIsEmptyWhenNoRequestsActive() throws Exception {
        Field inFlightField = MetricsProxyService.class.getDeclaredField("inFlight");
        inFlightField.setAccessible(true);
        ConcurrentMap<String, Mono<Object>> inFlightMap =
                (ConcurrentMap<String, Mono<Object>>) inFlightField.get(service);

        assertTrue(inFlightMap.isEmpty(), "In-flight map should be empty initially");
    }
}
