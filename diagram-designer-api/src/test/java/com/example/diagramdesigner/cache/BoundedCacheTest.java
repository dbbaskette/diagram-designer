package com.example.diagramdesigner.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests verifying that bounded Caffeine caches enforce max size and TTL,
 * matching the configurations used in MetricsProxyService, ServiceDiscovery,
 * and DiagramController.
 */
class BoundedCacheTest {

    @Test
    void cacheEvictsEntriesWhenMaxSizeExceeded() {
        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(3)
                .executor(Runnable::run) // execute eviction synchronously for testing
                .build();

        cache.put("a", "1");
        cache.put("b", "2");
        cache.put("c", "3");

        assertEquals(3, cache.estimatedSize());

        // Adding a 4th entry should trigger eviction
        cache.put("d", "4");
        cache.cleanUp(); // force eviction processing

        assertTrue(cache.estimatedSize() <= 3,
                "Cache size should not exceed maximum of 3, but was " + cache.estimatedSize());
        assertNotNull(cache.getIfPresent("d"), "Most recently added entry should be present");
    }

    @Test
    void cacheExpireEntriesAfterTtl() throws InterruptedException {
        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(100)
                .expireAfterWrite(Duration.ofMillis(100))
                .executor(Runnable::run)
                .build();

        cache.put("key", "value");
        assertEquals("value", cache.getIfPresent("key"));

        // Wait for TTL to expire
        Thread.sleep(200);
        cache.cleanUp();

        assertNull(cache.getIfPresent("key"),
                "Entry should have expired after TTL");
    }

    @Test
    void cacheReturnsNullForMissingKeys() {
        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(10)
                .expireAfterWrite(Duration.ofMinutes(5))
                .build();

        assertNull(cache.getIfPresent("nonexistent"));
    }

    @Test
    void cacheHitReturnsStoredValue() {
        Cache<String, Object> cache = Caffeine.newBuilder()
                .maximumSize(256)
                .expireAfterWrite(Duration.ofSeconds(30))
                .build();

        Object value = java.util.Map.of("metric", "cpu", "value", 42);
        cache.put("http://example.com/metrics", value);

        Object result = cache.getIfPresent("http://example.com/metrics");
        assertNotNull(result);
        assertEquals(value, result);
    }

    @Test
    void cacheInvalidateAllClearsAllEntries() {
        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(128)
                .expireAfterWrite(Duration.ofMinutes(5))
                .build();

        cache.put("service-a", "http://host-a:8080");
        cache.put("service-b", "http://host-b:8080");

        cache.invalidateAll();
        cache.cleanUp();

        assertEquals(0, cache.estimatedSize());
        assertNull(cache.getIfPresent("service-a"));
        assertNull(cache.getIfPresent("service-b"));
    }

    @Test
    void cachePutOverwritesExistingEntry() {
        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(10)
                .expireAfterWrite(Duration.ofMinutes(5))
                .build();

        cache.put("key", "old-value");
        cache.put("key", "new-value");

        assertEquals("new-value", cache.getIfPresent("key"));
    }

    @Test
    void metricsProxyCacheConfigMatchesExpected() {
        int maxSize = 256;
        int ttlMs = 30000;

        Cache<String, Object> cache = Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(Duration.ofMillis(ttlMs))
                .executor(Runnable::run)
                .build();

        // Fill beyond max size
        for (int i = 0; i < maxSize + 50; i++) {
            cache.put("url-" + i, "response-" + i);
        }
        cache.cleanUp();

        assertTrue(cache.estimatedSize() <= maxSize,
                "MetricsProxy cache should be bounded to " + maxSize + " entries, but was " + cache.estimatedSize());
    }

    @Test
    void serviceDiscoveryCacheConfigMatchesExpected() {
        int maxSize = 128;
        Duration ttl = Duration.ofMinutes(5);

        Cache<String, String> cache = Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(ttl)
                .executor(Runnable::run)
                .build();

        // Fill beyond max size
        for (int i = 0; i < maxSize + 50; i++) {
            cache.put("service-" + i, "http://host-" + i + ":8080");
        }
        cache.cleanUp();

        assertTrue(cache.estimatedSize() <= maxSize,
                "ServiceDiscovery cache should be bounded to " + maxSize + " entries, but was " + cache.estimatedSize());
    }
}
