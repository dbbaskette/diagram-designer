package com.example.diagramdesigner.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class ConfigsDirectoryResolver {

    private static final Logger logger = LoggerFactory.getLogger(ConfigsDirectoryResolver.class);

    private static final String[] POSSIBLE_PATHS = {
            "configs",
            "../configs",
            "./configs"
    };

    /**
     * Find the configs directory, trying multiple possible filesystem locations.
     * Returns null if only classpath configs are available (or nothing found).
     */
    public Path findConfigsDirectory() {
        for (String pathStr : POSSIBLE_PATHS) {
            Path path = Paths.get(pathStr);
            if (Files.exists(path) && Files.isDirectory(path)) {
                logger.debug("Found configs directory at: {}", path.toAbsolutePath());
                return path;
            }
        }

        try {
            ClassPathResource resource = new ClassPathResource("configs");
            if (resource.exists()) {
                logger.debug("Found configs in classpath resources; filesystem import not available for classpath configs");
                return null;
            }
        } catch (Exception e) {
            logger.debug("Could not access configs from classpath: {}", e.getMessage());
        }

        logger.warn("Configs directory not found in any of these locations: {}", String.join(", ", POSSIBLE_PATHS));
        return null;
    }
}
