package com.example.diagramdesigner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ConfigurationProcessor {

    private static final Logger logger = LoggerFactory.getLogger(ConfigurationProcessor.class);
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\$\\{([A-Z_][A-Z0-9_-]*)(:([^}]*))?\\}");

    private final Environment environment;
    private final ObjectMapper objectMapper;
    private final ServiceDiscovery serviceDiscovery;

    public ConfigurationProcessor(Environment environment, ObjectMapper objectMapper, ServiceDiscovery serviceDiscovery) {
        this.environment = environment;
        this.objectMapper = objectMapper;
        this.serviceDiscovery = serviceDiscovery;
    }

    /**
     * Process a JSON string by substituting environment variables
     * Variables should be in the format: ${VARIABLE_NAME} or ${VARIABLE_NAME:default_value}
     */
    public String processVariableSubstitution(String jsonContent) {
        if (jsonContent == null || jsonContent.isEmpty()) {
            return jsonContent;
        }

        try {
            // Parse the JSON
            JsonNode rootNode = objectMapper.readTree(jsonContent);

            // Debug logging for telegen node
            JsonNode nodesArray = rootNode.get("nodes");
            if (nodesArray != null && nodesArray.isArray()) {
                for (JsonNode node : nodesArray) {
                    if ("telegen".equals(node.get("name").asText())) {
                        logger.info("🔍 SPRING: Found telegen node with particles: {}", node.get("particles"));
                    }
                }
            }

            // Process the entire tree
            JsonNode processedNode = processNode(rootNode);

            // Convert back to JSON string
            return objectMapper.writeValueAsString(processedNode);

        } catch (Exception e) {
            logger.error("Error processing variable substitution in JSON", e);
            // Return original content if processing fails
            return jsonContent;
        }
    }

    /**
     * Process a JsonNode recursively, substituting variables in string values
     */
    private JsonNode processNode(JsonNode node) {
        if (node.isTextual()) {
            // Process string values for variable substitution
            String originalValue = node.textValue();
            String processedValue = substituteVariables(originalValue);
            return new TextNode(processedValue);

        } else if (node.isObject()) {
            // Recursively process object properties
            ObjectNode objectNode = objectMapper.createObjectNode();
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                objectNode.set(entry.getKey(), processNode(entry.getValue()));
            }

            return objectNode;

        } else if (node.isArray()) {
            // Recursively process array elements
            for (int i = 0; i < node.size(); i++) {
                ((com.fasterxml.jackson.databind.node.ArrayNode) node).set(i, processNode(node.get(i)));
            }

            return node;
        }

        // Return other types (numbers, booleans, null) unchanged
        return node;
    }

    /**
     * Substitute environment variables and service URLs in a string
     * Supports formats:
     * - ${VAR_NAME} and ${VAR_NAME:default_value} for environment variables
     * - ${SERVICE-NAME} for service discovery (e.g., ${my-service})
     */
    private String substituteVariables(String input) {
        if (input == null || !input.contains("${")) {
            return input;
        }

        Matcher matcher = VARIABLE_PATTERN.matcher(input);
        StringBuffer result = new StringBuffer();

        while (matcher.find()) {
            String variableName = matcher.group(1);
            String defaultValue = matcher.group(3); // Can be null

            String value = null;

            // Check if this looks like a service name (contains hyphens and not a typical env var)
            if (variableName.contains("-") && !variableName.matches(".*[0-9]+.*") && variableName.length() > 3) {
                // Try service discovery first for service-name-like variables
                value = serviceDiscovery.discoverServiceUrl(variableName);
                logger.debug("Service discovery for {} returned: {}", variableName, value);
            }

            // Fall back to environment variable if service discovery didn't work
            if (value == null) {
                value = environment.getProperty(variableName, defaultValue);
            }

            if (value != null) {
                // Replace the entire pattern with the resolved value
                matcher.appendReplacement(result, Matcher.quoteReplacement(value));
                logger.debug("Substituted variable {} with value: {}", variableName, value);
            } else {
                // Keep original if no value found and no default
                logger.warn("No value found for variable: {}", variableName);
                matcher.appendReplacement(result, Matcher.quoteReplacement(matcher.group(0)));
            }
        }

        matcher.appendTail(result);
        return result.toString();
    }
}