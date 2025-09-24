package com.example.diagramdesigner.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "metrics.proxy")
public class MetricsProxyProperties {

    private int timeoutMs = 10000;
    private boolean enableCaching = true;
    private int cacheTtlMs = 30000;

    // Getters and setters
    public int getTimeoutMs() { return timeoutMs; }
    public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }

    public boolean isEnableCaching() { return enableCaching; }
    public void setEnableCaching(boolean enableCaching) { this.enableCaching = enableCaching; }

    public int getCacheTtlMs() { return cacheTtlMs; }
    public void setCacheTtlMs(int cacheTtlMs) { this.cacheTtlMs = cacheTtlMs; }
}