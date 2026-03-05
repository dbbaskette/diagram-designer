package com.example.diagramdesigner.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfigurationProcessorTest {

    @Mock
    private Environment environment;

    @Mock
    private ServiceDiscovery serviceDiscovery;

    private ConfigurationProcessor configurationProcessor;

    @BeforeEach
    void setUp() {
        configurationProcessor = new ConfigurationProcessor(environment, new ObjectMapper(), serviceDiscovery);
    }

    @Test
    void substitutesUppercaseEnvironmentVariables() {
        when(environment.getProperty("API_HOST", (String) null)).thenReturn("api.internal.example.com");

        String result = configurationProcessor.processVariableSubstitution("{\"url\":\"https://${API_HOST}/health\"}");

        assertThat(result).contains("https://api.internal.example.com/health");
    }

    @Test
    void substitutesLowercaseHyphenServicePlaceholders() {
        when(serviceDiscovery.discoverServiceUrl("my-service")).thenReturn("http://my-service.apps.local");

        String result = configurationProcessor.processVariableSubstitution("{\"target\":\"${my-service}\"}");

        assertThat(result).contains("http://my-service.apps.local");
    }

    @Test
    void usesDefaultWhenServicePlaceholderIsUnresolved() {
        when(serviceDiscovery.discoverServiceUrl("my-service")).thenReturn(null);
        when(environment.getProperty("my-service", "http://fallback.local")).thenReturn("http://fallback.local");

        String result = configurationProcessor.processVariableSubstitution("{\"target\":\"${my-service:http://fallback.local}\"}");

        assertThat(result).contains("http://fallback.local");
    }
}
