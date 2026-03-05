package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.config.CacheProperties;
import com.example.diagramdesigner.dto.DiagramRequest;
import com.example.diagramdesigner.dto.DiagramResponse;
import com.example.diagramdesigner.model.Diagram;
import com.example.diagramdesigner.service.ConfigsDirectoryResolver;
import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.example.diagramdesigner.service.DiagramService;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.stream.Stream;

/**
 * REST Controller for serving diagram configuration files.
 *
 * This controller handles:
 * - Listing available diagram configuration files
 * - Serving individual diagram JSON files with variable substitution
 * - Supporting both filesystem (development) and classpath (deployment)
 * resource access
 */
@RestController
@RequestMapping("/api")
public class DiagramController {

    private static final Logger logger = LoggerFactory.getLogger(DiagramController.class);

    private final ConfigurationProcessor configurationProcessor;
    private final DiagramService diagramService;
    private final ConfigsDirectoryResolver configsDirectoryResolver;
    private final Cache<String, CachedConfig> configCache;

    @Autowired
    public DiagramController(ConfigurationProcessor configurationProcessor,
                             DiagramService diagramService,
                             ConfigsDirectoryResolver configsDirectoryResolver,
                             CacheProperties cacheProperties) {
        this.configurationProcessor = configurationProcessor;
        this.diagramService = diagramService;
        this.configsDirectoryResolver = configsDirectoryResolver;
        this.configCache = Caffeine.newBuilder()
                .maximumSize(cacheProperties.getDiagram().getMaxSize())
                .expireAfterWrite(Duration.ofSeconds(cacheProperties.getDiagram().getTtlSeconds()))
                .build();
    }

    @GetMapping("/diagrams")
    public ResponseEntity<List<String>> listDiagrams() {
        // Prefer database entries; fall back to file scan when DB is empty
        List<Diagram> dbDiagrams = diagramService.listDiagrams();
        if (!dbDiagrams.isEmpty()) {
            List<String> names = dbDiagrams.stream()
                    .map(d -> d.getName() + ".json")
                    .sorted()
                    .toList();
            logger.debug("Returning {} diagram names from database", names.size());
            return ResponseEntity.ok(names);
        }

        logger.debug("Database empty, falling back to file scan");
        return listDiagramsFromFiles();
    }

    private ResponseEntity<List<String>> listDiagramsFromFiles() {
        try {
            Path configsDir = configsDirectoryResolver.findConfigsDirectory();

            if (configsDir != null) {
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
                try {
                    ClassPathResource configsResource = new ClassPathResource("configs");
                    if (configsResource.exists()) {
                        List<String> knownFiles = List.of("diagram-config.json",
                                "Telemetry-Processing.json", "Telemetry-Processing-2.json",
                                "example-diagram-with-auth.json");

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
    @SuppressWarnings("null")
    public ResponseEntity<String> getDiagramConfig(@PathVariable String filename) {
        try {
            Path configsDir = configsDirectoryResolver.findConfigsDirectory();

            // Check cache first
            CachedConfig cached = configCache.getIfPresent(filename);
            if (cached != null) {
                // For filesystem, check if file has changed
                if (configsDir != null) {
                    Path configPath = configsDir.resolve(filename);
                    try {
                        long lastModified = Files.getLastModifiedTime(configPath).toMillis();
                        if (lastModified <= cached.lastModified) {
                            logger.debug("Serving {} from cache", filename);
                            return ResponseEntity.ok()
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .body(cached.content);
                        }
                    } catch (IOException e) {
                        // Ignore and reload
                    }
                } else {
                    // Classpath resources don't change at runtime, so cache is always valid
                    logger.debug("Serving {} from cache (classpath)", filename);
                    return ResponseEntity.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(cached.content);
                }
            }

            String processedContent;
            long lastModified = System.currentTimeMillis();

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
                    logger.warn("Security violation: Attempted to access file outside configs directory: {}",
                            resolvedPath);
                    return ResponseEntity.badRequest().build();
                }

                // Read the JSON content
                String jsonContent = Files.readString(configPath);
                lastModified = Files.getLastModifiedTime(configPath).toMillis();

                // Process variable substitutions
                processedContent = configurationProcessor.processVariableSubstitution(jsonContent);

                logger.debug("Served diagram config: {} from {} (processed {} characters)",
                        filename, configsDir, processedContent.length());

            } else {
                // Classpath approach (JAR deployment)
                try {
                    ClassPathResource configResource = new ClassPathResource("configs/" + filename);
                    if (!configResource.exists()) {
                        logger.warn("Diagram file not found in classpath: configs/{}", filename);
                        return ResponseEntity.notFound().build();
                    }

                    String jsonContent = new String(configResource.getInputStream().readAllBytes());
                    processedContent = configurationProcessor.processVariableSubstitution(jsonContent);

                    logger.debug("Served diagram config: {} from classpath (processed {} characters)",
                            filename, processedContent.length());

                } catch (Exception e) {
                    logger.debug("Error accessing config from classpath: {}", e.getMessage());
                    return ResponseEntity.notFound().build();
                }
            }

            // Update cache
            configCache.put(filename, new CachedConfig(processedContent, lastModified));

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(processedContent);

        } catch (IOException e) {
            logger.error("Error reading diagram file: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            logger.error("Error processing diagram file: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- Database-backed CRUD endpoints ---

    @GetMapping("/diagrams/db")
    public ResponseEntity<List<DiagramResponse>> listDbDiagrams() {
        return ResponseEntity.ok(diagramService.listDiagrams().stream()
                .map(this::toSummaryResponse)
                .toList());
    }

    @GetMapping("/diagrams/db/{id}")
    public ResponseEntity<DiagramResponse> getDbDiagram(@PathVariable Long id) {
        Diagram diagram = diagramService.getDiagram(id);
        String processedConfig = diagramService.getProcessedConfig(diagram);
        DiagramResponse response = new DiagramResponse(
                diagram.getId(), diagram.getName(), diagram.getTitle(),
                processedConfig, diagram.getCreatedAt(), diagram.getUpdatedAt());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/diagrams/db")
    public ResponseEntity<DiagramResponse> createDbDiagram(@Valid @RequestBody DiagramRequest request) {
        Diagram created = diagramService.createDiagram(request);
        DiagramResponse response = toFullResponse(created);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/diagrams/db/{id}")
    public ResponseEntity<DiagramResponse> updateDbDiagram(@PathVariable Long id,
                                                           @Valid @RequestBody DiagramRequest request) {
        Diagram updated = diagramService.updateDiagram(id, request);
        return ResponseEntity.ok(toFullResponse(updated));
    }

    @DeleteMapping("/diagrams/db/{id}")
    public ResponseEntity<Void> deleteDbDiagram(@PathVariable Long id) {
        diagramService.deleteDiagram(id);
        return ResponseEntity.noContent().build();
    }

    private DiagramResponse toSummaryResponse(Diagram diagram) {
        return new DiagramResponse(
                diagram.getId(), diagram.getName(), diagram.getTitle(),
                null, diagram.getCreatedAt(), diagram.getUpdatedAt());
    }

    private DiagramResponse toFullResponse(Diagram diagram) {
        return new DiagramResponse(
                diagram.getId(), diagram.getName(), diagram.getTitle(),
                diagram.getConfig(), diagram.getCreatedAt(), diagram.getUpdatedAt());
    }

    // Cache structure
    private static class CachedConfig {
        final String content;
        final long lastModified;

        CachedConfig(String content, long lastModified) {
            this.content = content;
            this.lastModified = lastModified;
        }
    }

}