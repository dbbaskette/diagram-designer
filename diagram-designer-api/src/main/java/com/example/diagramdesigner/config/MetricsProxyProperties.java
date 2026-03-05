package com.example.diagramdesigner.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "metrics.proxy")
public class MetricsProxyProperties {

    @Min(1)
    private int timeoutMs = 10000;
    private boolean enableCaching = true;
    @Min(1)
    private int cacheTtlMs = 30000;
    @Min(1)
    private int cacheMaxSize = 256;

    // Getters and setters
    public int getTimeoutMs() { return timeoutMs; }
    public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }

    public boolean isEnableCaching() { return enableCaching; }
    public void setEnableCaching(boolean enableCaching) { this.enableCaching = enableCaching; }

    public int getCacheTtlMs() { return cacheTtlMs; }
    public void setCacheTtlMs(int cacheTtlMs) { this.cacheTtlMs = cacheTtlMs; }

    public int getCacheMaxSize() { return cacheMaxSize; }
    public void setCacheMaxSize(int cacheMaxSize) { this.cacheMaxSize = cacheMaxSize; }
}