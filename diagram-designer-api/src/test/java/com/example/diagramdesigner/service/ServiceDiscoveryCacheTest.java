package com.example.diagramdesigner.service;

import com.example.diagramdesigner.config.CacheProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.core.env.Environment;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ServiceDiscoveryCacheTest {

    @Mock
    private DiscoveryClient discoveryClient;

    @Mock
    private Environment environment;

    @Test
    void defaultCachePropertiesMatchPreviousHardcodedValues() {
        CacheProperties cacheProperties = new CacheProperties();

        assertEquals(128, cacheProperties.getServiceDiscovery().getMaxSize());
        assertEquals(300, cacheProperties.getServiceDiscovery().getTtlSeconds());
    }

    @Test
    void serviceDiscoveryAcceptsCustomCacheProperties() {
        CacheProperties cacheProperties = new CacheProperties();
        cacheProperties.getServiceDiscovery().setMaxSize(64);
        cacheProperties.getServiceDiscovery().setTtlSeconds(60);

        ServiceDiscovery serviceDiscovery = new ServiceDiscovery(
                discoveryClient, new ObjectMapper(), environment, cacheProperties);
        assertNotNull(serviceDiscovery);
    }

    @Test
    void clearCacheDoesNotThrow() {
        CacheProperties cacheProperties = new CacheProperties();
        ServiceDiscovery serviceDiscovery = new ServiceDiscovery(
                discoveryClient, new ObjectMapper(), environment, cacheProperties);

        assertDoesNotThrow(serviceDiscovery::clearCache);
    }
}
