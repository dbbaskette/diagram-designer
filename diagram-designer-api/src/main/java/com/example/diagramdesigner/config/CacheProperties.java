package com.example.diagramdesigner.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "cache")
public class CacheProperties {

    private final Diagram diagram = new Diagram();
    private final ServiceDiscovery serviceDiscovery = new ServiceDiscovery();

    public Diagram getDiagram() { return diagram; }
    public ServiceDiscovery getServiceDiscovery() { return serviceDiscovery; }

    public static class Diagram {
        @Min(1)
        private int maxSize = 64;

        @Min(1)
        private long ttlSeconds = 600;

        public int getMaxSize() { return maxSize; }
        public void setMaxSize(int maxSize) { this.maxSize = maxSize; }

        public long getTtlSeconds() { return ttlSeconds; }
        public void setTtlSeconds(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    }

    public static class ServiceDiscovery {
        @Min(1)
        private int maxSize = 128;

        @Min(1)
        private long ttlSeconds = 300;

        public int getMaxSize() { return maxSize; }
        public void setMaxSize(int maxSize) { this.maxSize = maxSize; }

        public long getTtlSeconds() { return ttlSeconds; }
        public void setTtlSeconds(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    }
}
