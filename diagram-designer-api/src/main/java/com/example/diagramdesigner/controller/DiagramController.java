package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

/**
 * REST Controller for serving diagram configuration files.
 *
 * This controller handles:
 * - Listing available diagram configuration files
 * - Serving individual diagram JSON files with variable substitution
 * - Supporting both filesystem (development) and classpath (deployment) resource access
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DiagramController {

    private static final Logger logger = LoggerFactory.getLogger(DiagramController.class);

    private final ConfigurationProcessor configurationProcessor;

    @Autowired
    public DiagramController(ConfigurationProcessor configurationProcessor) {
        this.configurationProcessor = configurationProcessor;
    }

    @GetMapping("/diagrams")
    public ResponseEntity<List<String>> listDiagrams() {
        try {
            Path configsDir = findConfigsDirectory();

            if (configsDir != null) {
                // File system approach (local development)
                try (Stream<Path> files = Files.list(configsDir)) {
                    List<String> diagramFiles = files
                            .filter(path -> path.toString().endsWith(".json"))
                            .map(path -> path.getFileName().toString())
                            .sorted()
                            .toList();

                    logger.debug("Found {} diagram files in {}: {}", diagramFiles.size(), configsDir, diagramFiles);
                    return ResponseEntity.ok(diagramFiles);
                }
            } else {
                // Classpath approach (JAR deployment)
                try {
                    ClassPathResource configsResource = new ClassPathResource("configs");
                    if (configsResource.exists()) {
                        // In a JAR, we need to list resources differently
                        // For now, return a hardcoded list - this can be improved later
                        List<String> knownFiles = List.of("diagram-config.json",
                                                        "Telemetry-Processing.json", "Telemetry-Processing-2.json",
                                                        "example-diagram-with-auth.json");

                        // Filter to only include files that actually exist
                        List<String> existingFiles = knownFiles.stream()
                                .filter(filename -> new ClassPathResource("configs/" + filename).exists())
                                .sorted()
                                .toList();

                        logger.debug("Found {} diagram files in classpath: {}", existingFiles.size(), existingFiles);
                        return ResponseEntity.ok(existingFiles);
                    }
                } catch (Exception e) {
                    logger.debug("Error accessing configs from classpath: {}", e.getMessage());
                }
            }

            logger.warn("No configs directory found");
            return ResponseEntity.ok(List.of());

        } catch (IOException e) {
            logger.error("Error listing diagram files", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/diagrams/{filename:.+\\.json}")
    public ResponseEntity<String> getDiagramConfig(@PathVariable String filename) {
        try {
            Path configsDir = findConfigsDirectory();

            if (configsDir != null) {
                // File system approach (local development)
                Path configPath = configsDir.resolve(filename);

                if (!Files.exists(configPath)) {
                    logger.warn("Diagram file not found: {}", configPath.toAbsolutePath());
                    return ResponseEntity.notFound().build();
                }

                // Security check: ensure the file is within the configs directory
                Path resolvedPath = configPath.toAbsolutePath().normalize();
                Path normalizedConfigsDir = configsDir.toAbsolutePath().normalize();

                if (!resolvedPath.startsWith(normalizedConfigsDir)) {
                    logger.warn("Security violation: Attempted to access file outside configs directory: {}", resolvedPath);
                    return ResponseEntity.badRequest().build();
                }

                // Read the JSON content
                String jsonContent = Files.readString(configPath);

                // Process variable substitutions
                String processedContent = configurationProcessor.processVariableSubstitution(jsonContent);

                logger.debug("Served diagram config: {} from {} (processed {} characters)",
                            filename, configsDir, processedContent.length());

                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(processedContent);
            } else {
                // Classpath approach (JAR deployment)
                try {
                    ClassPathResource configResource = new ClassPathResource("configs/" + filename);
                    if (!configResource.exists()) {
                        logger.warn("Diagram file not found in classpath: configs/{}", filename);
                        return ResponseEntity.notFound().build();
                    }

                    // Read the JSON content from classpath
                    String jsonContent = new String(configResource.getInputStream().readAllBytes());

                    logger.info("🔍 SPRING: Loading {} from classpath, raw content length: {}", filename, jsonContent.length());

                    // Log first telegen node if present
                    if (jsonContent.contains("telegen")) {
                        int idx = jsonContent.indexOf("telegen");
                        if (idx > 0) {
                            int particleIdx = jsonContent.indexOf("particles", idx);
                            if (particleIdx > 0 && particleIdx < idx + 500) {
                                String snippet = jsonContent.substring(particleIdx, Math.min(particleIdx + 200, jsonContent.length()));
                                logger.info("🔍 SPRING: Telegen particles snippet: {}", snippet);
                            }
                        }
                    }

                    // Process variable substitutions
                    String processedContent = configurationProcessor.processVariableSubstitution(jsonContent);

                    logger.debug("Served diagram config: {} from classpath (processed {} characters)",
                                filename, processedContent.length());

                    return ResponseEntity.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(processedContent);

                } catch (Exception e) {
                    logger.debug("Error accessing config from classpath: {}", e.getMessage());
                    return ResponseEntity.notFound().build();
                }
            }

        } catch (IOException e) {
            logger.error("Error reading diagram file: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            logger.error("Error processing diagram file: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Find the configs directory, trying multiple possible locations
     */
    private Path findConfigsDirectory() {
        // Try different locations for configs directory
        String[] possiblePaths = {
                "configs",           // Local development (project root)
                "../configs",        // If running from backend/ subdirectory
                "./configs"          // Deployment (same directory as JAR)
        };

        for (String pathStr : possiblePaths) {
            Path path = Paths.get(pathStr);
            if (Files.exists(path) && Files.isDirectory(path)) {
                logger.debug("Found configs directory at: {}", path.toAbsolutePath());
                return path;
            }
        }

        // Try classpath location (packaged in JAR)
        try {
            ClassPathResource resource = new ClassPathResource("configs");
            if (resource.exists()) {
                // For JAR deployment, we need to work with the resource directly
                // This is a fallback that will be used by other methods
                logger.debug("Found configs in classpath resources");
                return null; // Special case: return null to indicate classpath usage
            }
        } catch (Exception e) {
            logger.debug("Could not access configs from classpath: {}", e.getMessage());
        }

        logger.warn("Configs directory not found in any of these locations: {}", String.join(", ", possiblePaths));
        return null;
    }
}