package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class NodeDetailsController {

    private static final Logger logger = LoggerFactory.getLogger(NodeDetailsController.class);
    private static final Pattern NODE_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{1,64}$");

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final ConfigurationProcessor configurationProcessor;

    @Autowired
    public NodeDetailsController(ResourceLoader resourceLoader, ObjectMapper objectMapper,
            ConfigurationProcessor configurationProcessor) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.configurationProcessor = configurationProcessor;
    }

    @GetMapping("/node-details/{nodeName}")
    public ResponseEntity<Object> getNodeDetails(@PathVariable String nodeName) {
        if (!NODE_NAME_PATTERN.matcher(nodeName).matches()) {
            logger.warn("Rejected invalid nodeName: {}", nodeName);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid nodeName. Allowed pattern: ^[a-zA-Z0-9_-]{1,64}$"));
        }

        logger.info("Loading node details for: {}", nodeName);

        try {
            String configPath = "classpath:details/" + nodeName + ".json";
            Resource resource = resourceLoader.getResource(configPath);

            if (!resource.exists()) {
                configPath = "classpath:configs/details/" + nodeName + ".json";
                resource = resourceLoader.getResource(configPath);
            }

            if (!resource.exists()) {
                logger.debug("No details configuration found for node: {}", nodeName);
                return ResponseEntity.notFound().build();
            }

            String jsonContent = resource.getContentAsString(StandardCharsets.UTF_8);
            String processedJson = configurationProcessor.processVariableSubstitution(jsonContent);

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
}
