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
import java.util.concurrent.TimeUnit;
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
        // Default: return empty fingerprint for any URL/node
        when(authResolver.getAuthFingerprint(anyString(), any())).thenReturn("");
        service = spy(new MetricsProxyService(properties, objectMapper, authResolver));
    }

    @Test
    void buildCacheKeyIncludesNodeAndHandlesNull() {
        String keyA = service.buildCacheKey("http://host/metrics", "node-a", "fp1");
        String keyB = service.buildCacheKey("http://host/metrics", "node-b", "fp1");
        String keyNull = service.buildCacheKey("http://host/metrics", null, "fp1");
        String keyASame = service.buildCacheKey("http://host/metrics", "node-a", "fp1");

        assertNotEquals(keyA, keyB, "Same URL with different nodes should produce different keys");
        assertNotEquals(keyA, keyNull, "Keyed vs null-node should differ");
        assertEquals(keyA, keyASame, "Same URL+node should produce the same key");
        assertTrue(keyA.contains("node-a"));
    }

    @Test
    void buildCacheKeyIncludesAuthFingerprint() {
        String key1 = service.buildCacheKey("http://host/metrics", "node-a", "fingerprint-abc");
        String key2 = service.buildCacheKey("http://host/metrics", "node-a", "fingerprint-xyz");
        String keyNoAuth = service.buildCacheKey("http://host/metrics", "node-a", null);

        assertNotEquals(key1, key2, "Same URL+node with different auth fingerprints should differ");
        assertNotEquals(key1, keyNoAuth, "Auth vs no-auth fingerprint should differ");
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
        assertTrue(latch.await(5, TimeUnit.SECONDS), "Timed out waiting for responses");

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
        assertTrue(latch.await(5, TimeUnit.SECONDS), "Timed out waiting for error responses");

        assertEquals(503, results[0].getStatusCode().value());
        assertEquals(503, results[1].getStatusCode().value());

        // Verify inFlight map is cleaned up
        Field inFlightField = MetricsProxyService.class.getDeclaredField("inFlight");
        inFlightField.setAccessible(true);
        ConcurrentMap<String, Mono<Object>> inFlightMap =
                (ConcurrentMap<String, Mono<Object>>) inFlightField.get(service);
        assertTrue(inFlightMap.isEmpty(), "In-flight map should be empty after error completes");
    }

    @SuppressWarnings("unchecked")
    @Test
    void successfulInFlightRequestCleansUpMap() throws Exception {
        Sinks.One<Object> sink = Sinks.one();

        doReturn(sink.asMono())
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");

        properties.setEnableCaching(false);

        Mono<ResponseEntity<Object>> call1 = service.proxyRequest("http://host/metrics", "node-a");
        Mono<ResponseEntity<Object>> call2 = service.proxyRequest("http://host/metrics", "node-a");

        CountDownLatch latch = new CountDownLatch(2);
        ResponseEntity<?>[] results = new ResponseEntity<?>[2];

        call1.subscribe(re -> { results[0] = re; latch.countDown(); });
        call2.subscribe(re -> { results[1] = re; latch.countDown(); });

        Map<String, Object> response = Map.of("result", "ok");
        sink.tryEmitValue(response);
        assertTrue(latch.await(5, TimeUnit.SECONDS), "Timed out waiting for responses");

        assertEquals(200, results[0].getStatusCode().value());
        assertEquals(200, results[1].getStatusCode().value());

        // Verify inFlight map is cleaned up after successful completion
        Field inFlightField = MetricsProxyService.class.getDeclaredField("inFlight");
        inFlightField.setAccessible(true);
        ConcurrentMap<String, Mono<Object>> inFlightMap =
                (ConcurrentMap<String, Mono<Object>>) inFlightField.get(service);
        assertTrue(inFlightMap.isEmpty(), "In-flight map should be empty after successful completion");
    }

    @Test
    void sameUrlDifferentAuthFingerprintProducesIsolatedCacheEntries() {
        // Simulate two nodes that hit the same URL but resolve to different credentials
        when(authResolver.getAuthFingerprint("http://host/metrics", "node-a")).thenReturn("fp-aaa");
        when(authResolver.getAuthFingerprint("http://host/metrics", "node-b")).thenReturn("fp-bbb");

        Map<String, Object> responseA = Map.of("data", "from-node-a-creds");
        Map<String, Object> responseB = Map.of("data", "from-node-b-creds");

        doReturn(Mono.just((Object) responseA))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");
        doReturn(Mono.just((Object) responseB))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-b");

        // Populate cache for node-a
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(responseA, re.getBody()))
                .verifyComplete();

        // node-b must NOT receive node-a's cached response
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-b"))
                .assertNext(re -> assertEquals(responseB, re.getBody()))
                .verifyComplete();

        // Both upstream calls should have been made (no cross-node cache hit)
        verify(service).makeAuthenticatedRequest("http://host/metrics", "node-a");
        verify(service).makeAuthenticatedRequest("http://host/metrics", "node-b");
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

    @Test
    void cachingDisabledBypassesCacheEntirelyAndCallsUpstreamEveryTime() {
        properties.setEnableCaching(false);
        service = spy(new MetricsProxyService(properties, objectMapper, authResolver));
        when(authResolver.getAuthFingerprint(anyString(), any())).thenReturn("");

        Map<String, Object> response = Map.of("data", "fresh");

        doReturn(Mono.just((Object) response))
                .when(service).makeAuthenticatedRequest("http://host/metrics", "node-a");

        // First call
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(response, re.getBody()))
                .verifyComplete();

        // Second call — should NOT be cached, should call upstream again
        StepVerifier.create(service.proxyRequest("http://host/metrics", "node-a"))
                .assertNext(re -> assertEquals(response, re.getBody()))
                .verifyComplete();

        verify(service, times(2)).makeAuthenticatedRequest("http://host/metrics", "node-a");
    }
}
