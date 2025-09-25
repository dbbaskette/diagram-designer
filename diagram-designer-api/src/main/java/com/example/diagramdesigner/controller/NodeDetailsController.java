package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class NodeDetailsController {

    private static final Logger logger = LoggerFactory.getLogger(NodeDetailsController.class);

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final ConfigurationProcessor configurationProcessor;

    @Autowired
    public NodeDetailsController(ResourceLoader resourceLoader, ObjectMapper objectMapper, ConfigurationProcessor configurationProcessor) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.configurationProcessor = configurationProcessor;
    }

    @GetMapping("/node-details/{nodeName}")
    public ResponseEntity<Object> getNodeDetails(@PathVariable String nodeName) {
        logger.info("Loading node details for: {}", nodeName);

        try {
            // Try to load from classpath first (packaged in JAR)
            String configPath = "classpath:details/" + nodeName + ".json";
            Resource resource = resourceLoader.getResource(configPath);

            if (!resource.exists()) {
                // Try alternative location
                configPath = "classpath:configs/details/" + nodeName + ".json";
                resource = resourceLoader.getResource(configPath);
            }

            if (!resource.exists()) {
                logger.debug("No details configuration found for node: {}", nodeName);
                return ResponseEntity.notFound().build();
            }

            // Read the raw JSON content
            String jsonContent = resource.getContentAsString(StandardCharsets.UTF_8);
            logger.debug("Raw JSON content for {}: {}", nodeName, jsonContent.substring(0, Math.min(100, jsonContent.length())));

            // Process variable substitution (including service discovery placeholders)
            String processedJson = configurationProcessor.processVariableSubstitution(jsonContent);
            logger.debug("Processed JSON for {}: {}", nodeName, processedJson.substring(0, Math.min(100, processedJson.length())));

            // Parse the processed JSON
            @SuppressWarnings("unchecked")
            Map<String, Object> nodeDetails = objectMapper.readValue(processedJson, Map.class);

            logger.debug("Successfully loaded and processed details for node: {}", nodeName);
            return ResponseEntity.ok(nodeDetails);

        } catch (IOException e) {
            logger.error("Error reading node details for {}: {}", nodeName, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load node details", "message", e.getMessage()));
        }
    }

    @GetMapping("/node-details")
    public ResponseEntity<Object> listAvailableDetails() {
        // This endpoint could list all available detail configurations
        // For now, return a simple response indicating how to create them
        return ResponseEntity.ok(Map.of(
                "message", "Node details endpoint is active",
                "usage", "GET /api/node-details/{nodeName}",
                "location", "Place detail JSON files in src/main/resources/details/ or src/main/resources/configs/details/",
                "example", Map.of(
                        "title", "Service Details",
                        "description", "Detailed information about this service",
                        "sections", new Object[]{
                                Map.of(
                                        "title", "Configuration",
                                        "type", "info",
                                        "content", "<div>Service configuration details...</div>"
                                ),
                                Map.of(
                                        "title", "Metrics",
                                        "type", "metrics",
                                        "content", "<div>Real-time metrics...</div>"
                                )
                        },
                        "links", new Object[]{
                                Map.of(
                                        "label", "Dashboard",
                                        "url", "https://dashboard.example.com",
                                        "type", "primary"
                                )
                        }
                )
        ));
    }
}