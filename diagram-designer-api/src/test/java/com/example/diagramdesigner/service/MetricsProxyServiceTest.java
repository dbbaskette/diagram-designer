package com.example.diagramdesigner.service;

import com.example.diagramdesigner.config.MetricsProxyProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.test.StepVerifier;

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
        service = spy(new MetricsProxyService(properties, objectMapper, authResolver));
    }

    @Test
    void buildCacheKeyIncludesNodeAndHandlesNull() {
        String keyA = service.buildCacheKey("http://host/metrics", "node-a");
        String keyB = service.buildCacheKey("http://host/metrics", "node-b");
        String keyNull = service.buildCacheKey("http://host/metrics", null);
        String keyASame = service.buildCacheKey("http://host/metrics", "node-a");

        assertNotEquals(keyA, keyB, "Same URL with different nodes should produce different keys");
        assertNotEquals(keyA, keyNull, "Keyed vs null-node should differ");
        assertEquals(keyA, keyASame, "Same URL+node should produce the same key");
        assertTrue(keyA.contains("node-a"));
    }

    @Test
    void proxyRequestUsesDifferentCacheEntriesForDifferentNodes() {
        Map<String, Object> responseA = Map.of("data", "from-a");
        Map<String, Object> responseB = Map.of("data", "from-b");

        doReturn(Mono.just((Object) responseA))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");
        doReturn(Mono.just((Object) responseB))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-b");

        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(responseA, re.getBody()))
                .verifyComplete();

        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-b"))
                .assertNext(re -> assertEquals(responseB, re.getBody()))
                .verifyComplete();

        verify(service).makeAuthenticatedRequest("http://host/metrics", "node-a");
        verify(service).makeAuthenticatedRequest("http://host/metrics", "node-b");
    }

    @Test
    void concurrentRequestsForSameKeyDeduplicateToSingleUpstreamCall() throws Exception {
        Sinks.One<Object> sink = Sinks.one();
        AtomicInteger upstreamCalls = new AtomicInteger(0);

        doAnswer(invocation -> {
            upstreamCalls.incrementAndGet();
            return sink.asMono();
        }).when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");

        // Disable caching so both calls go through in-flight path
        properties.setEnableCaching(false);

        Mono<ResponseEntity<Object>> call1 = service.proxyRequest("http://host/metrics", "node-a");
        Mono<ResponseEntity<Object>> call2 = service.proxyRequest("http://host/metrics", "node-a");

        Map<String, Object> response = Map.of("result", "ok");

        // Subscribe both before completing
        CountDownLatch latch = new CountDownLatch(2);
        ResponseEntity<?>[] results = new ResponseEntity<?>[2];

        call1.subscribe(re -> { results[0] = re; latch.countDown(); });
        call2.subscribe(re -> { results[1] = re; latch.countDown(); });

        // Complete the upstream
        sink.tryEmitValue(response);
        latch.await();

        assertEquals(1, upstreamCalls.get(), "Should only invoke upstream once for concurrent identical requests");
        assertEquals(response, results[0].getBody());
        assertEquals(response, results[1].getBody());
    }

    @SuppressWarnings("unchecked")
    @Test
    void errorInSharedInFlightPropagatesAndCleansUp() throws Exception {
        Sinks.One<Object> sink = Sinks.one();

        doReturn(sink.asMono())
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");

        properties.setEnableCaching(false);

        Mono<ResponseEntity<Object>> call1 = service.proxyRequest("http://host/metrics", "node-a");
        Mono<ResponseEntity<Object>> call2 = service.proxyRequest("http://host/metrics", "node-a");

        // Both should get error-resume handling (SERVICE_UNAVAILABLE)
        CountDownLatch latch = new CountDownLatch(2);
        ResponseEntity<?>[] results = new ResponseEntity<?>[2];

        call1.subscribe(re -> { results[0] = re; latch.countDown(); });
        call2.subscribe(re -> { results[1] = re; latch.countDown(); });

        sink.tryEmitError(new RuntimeException("upstream failure"));
        latch.await();

        assertEquals(503, results[0].getStatusCode().value());
        assertEquals(503, results[1].getStatusCode().value());

        // Verify inFlight map is cleaned up
        Field inFlightField = MetricsProxyService.class.getDeclaredField("inFlight");
        inFlightField.setAccessible(true);
        ConcurrentMap<String, Mono<Object>> inFlightMap =
                (ConcurrentMap<String, Mono<Object>>) inFlightField.get(service);
        assertTrue(inFlightMap.isEmpty(), "In-flight map should be empty after error completes");
    }

    @Test
    void cachedResponseReturnedWithoutUpstreamCall() {
        Map<String, Object> response = Map.of("cached", true);

        doReturn(Mono.just((Object) response))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");

        // First call populates cache
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(response, re.getBody()))
                .verifyComplete();

        // Second call should hit cache, no additional upstream call
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(response, re.getBody()))
                .verifyComplete();

        verify(service, times(1)).makeAuthenticatedRequest("http://host/metrics", "node-a");
    }
}
