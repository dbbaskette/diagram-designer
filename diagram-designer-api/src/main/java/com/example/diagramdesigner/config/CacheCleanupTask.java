package com.example.diagramdesigner.config;

import com.example.diagramdesigner.service.MetricsProxyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class CacheCleanupTask {

    private static final Logger logger = LoggerFactory.getLogger(CacheCleanupTask.class);

    private final MetricsProxyService metricsProxyService;

    @Autowired
    public CacheCleanupTask(MetricsProxyService metricsProxyService) {
        this.metricsProxyService = metricsProxyService;
    }

    @Scheduled(fixedRate = 60000) // Run every minute
    public void cleanupExpiredCacheEntries() {
        logger.debug("Running cache cleanup task");
        metricsProxyService.cleanupCache();
    }
}