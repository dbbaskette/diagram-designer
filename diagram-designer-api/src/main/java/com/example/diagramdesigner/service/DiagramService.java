package com.example.diagramdesigner.service;

import com.example.diagramdesigner.dto.DiagramRequest;
import com.example.diagramdesigner.model.Diagram;
import com.example.diagramdesigner.repository.DiagramRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

@Service
public class DiagramService {

    private static final Logger logger = LoggerFactory.getLogger(DiagramService.class);

    private final DiagramRepository diagramRepository;
    private final ConfigurationProcessor configurationProcessor;
    private final ObjectMapper objectMapper;
    private final ConfigsDirectoryResolver configsDirectoryResolver;

    public DiagramService(DiagramRepository diagramRepository,
                          ConfigurationProcessor configurationProcessor,
                          ObjectMapper objectMapper,
                          ConfigsDirectoryResolver configsDirectoryResolver) {
        this.diagramRepository = diagramRepository;
        this.configurationProcessor = configurationProcessor;
        this.objectMapper = objectMapper;
        this.configsDirectoryResolver = configsDirectoryResolver;
    }

    public List<Diagram> listDiagrams() {
        return diagramRepository.findAll();
    }

    public Diagram getDiagram(Long id) {
        return diagramRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Diagram not found with id: " + id));
    }

    public Diagram getDiagramByName(String name) {
        return diagramRepository.findByName(name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Diagram not found with name: " + name));
    }

    public Diagram createDiagram(DiagramRequest dto) {
        if (diagramRepository.findByName(dto.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Diagram already exists with name: " + dto.getName());
        }
        Diagram diagram = new Diagram();
        diagram.setName(dto.getName());
        diagram.setTitle(dto.getTitle());
        diagram.setConfig(dto.getConfig());
        return diagramRepository.save(diagram);
    }

    public Diagram updateDiagram(Long id, DiagramRequest dto) {
        Diagram diagram = getDiagram(id);
        diagram.setName(dto.getName());
        diagram.setTitle(dto.getTitle());
        diagram.setConfig(dto.getConfig());
        return diagramRepository.save(diagram);
    }

    public void deleteDiagram(Long id) {
        Diagram diagram = diagramRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Diagram not found with id: " + id));
        diagramRepository.delete(diagram);
    }

    public String getProcessedConfig(Diagram diagram) {
        return configurationProcessor.processVariableSubstitution(diagram.getConfig());
    }

    @PostConstruct
    void importConfigFiles() {
        Path configsDir = configsDirectoryResolver.findConfigsDirectory();
        importFromDirectory(configsDir);
    }

    void importFromDirectory(Path configsDir) {
        if (configsDir == null) {
            logger.info("No filesystem configs directory found; skipping JSON import");
            return;
        }

        try (Stream<Path> files = Files.list(configsDir)) {
            files.filter(p -> p.toString().endsWith(".json"))
                    .forEach(this::importIfAbsent);
        } catch (IOException e) {
            logger.error("Error scanning configs directory for import", e);
        }
    }

    void importIfAbsent(Path jsonFile) {
        String filename = jsonFile.getFileName().toString();
        String name = filename.substring(0, filename.length() - ".json".length());

        if (diagramRepository.findByName(name).isPresent()) {
            logger.debug("Diagram '{}' already exists in DB; skipping import", name);
            return;
        }

        try {
            String content = Files.readString(jsonFile);
            String title = extractTitle(content);

            Diagram diagram = new Diagram();
            diagram.setName(name);
            diagram.setTitle(title);
            diagram.setConfig(content);
            diagramRepository.save(diagram);

            logger.info("Imported diagram '{}' from {}", name, jsonFile.getFileName());
        } catch (IOException e) {
            logger.error("Failed to import config file: {}", jsonFile, e);
        }
    }

    private String extractTitle(String jsonContent) {
        try {
            JsonNode root = objectMapper.readTree(jsonContent);
            JsonNode configNode = root.path("config").path("title");
            if (!configNode.isMissingNode() && configNode.isTextual()) {
                return configNode.textValue();
            }
        } catch (Exception e) {
            logger.debug("Could not extract title from JSON config", e);
        }
        return null;
    }

}
