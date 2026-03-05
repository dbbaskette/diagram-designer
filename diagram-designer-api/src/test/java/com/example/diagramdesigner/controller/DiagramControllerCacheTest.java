package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.config.CacheProperties;
import com.example.diagramdesigner.service.ConfigsDirectoryResolver;
import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.example.diagramdesigner.service.DiagramService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class DiagramControllerCacheTest {

    @Mock
    private ConfigurationProcessor configurationProcessor;

    @Mock
    private DiagramService diagramService;

    @Mock
    private ConfigsDirectoryResolver configsDirectoryResolver;

    private CacheProperties cacheProperties;
    private DiagramController controller;

    @BeforeEach
    void setUp() {
        cacheProperties = new CacheProperties();
        controller = new DiagramController(configurationProcessor, diagramService, configsDirectoryResolver, cacheProperties);
    }

    @Test
    void cachePropertiesDefaultsMatchPreviousHardcodedValues() {
        assertEquals(64, cacheProperties.getDiagramCache().getMaxSize());
        assertEquals(600, cacheProperties.getDiagramCache().getTtlSeconds());
    }

    @Test
    void cachePropertiesAreConfigurable() {
        cacheProperties.getDiagramCache().setMaxSize(32);
        cacheProperties.getDiagramCache().setTtlSeconds(120);

        DiagramController customController = new DiagramController(configurationProcessor, diagramService, configsDirectoryResolver, cacheProperties);
        assertNotNull(customController);
        assertEquals(32, cacheProperties.getDiagramCache().getMaxSize());
        assertEquals(120, cacheProperties.getDiagramCache().getTtlSeconds());
    }
}
