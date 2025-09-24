package com.example.diagramdesigner.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Controller for serving the Single Page Application (SPA) frontend.
 *
 * This controller handles:
 * - Serving the main HTML page for all non-API routes
 * - Dynamically generating HTML with correct asset references from Vite's manifest.json
 * - Supporting client-side routing by forwarding all non-API requests to the SPA
 */
@Controller
public class SpaController {

    private static final String DEFAULT_ENTRY = "index.html";
    private static final String APPLICATION_TITLE = "Diagram Designer";

    private final ObjectMapper objectMapper;

    public SpaController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @RequestMapping(value = {"/{path:[^\\.]*}", "/", "/{path:^(?!api).*}/{subpath:[^\\.]*}"})
    public ResponseEntity<String> forward() {
        try {
            Resource manifestResource = new ClassPathResource("static/manifest.json");

            if (!manifestResource.exists()) {
                String message = "Frontend assets are missing. Run 'npm run build' in the frontend directory.";
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body(message);
            }

            Map<String, Map<String, Object>> manifest = objectMapper.readValue(
                    manifestResource.getInputStream(),
                    new TypeReference<>() {}
            );

            Optional<Map<String, Object>> entryLookup = Optional.ofNullable(manifest.get(DEFAULT_ENTRY));
            if (entryLookup.isEmpty()) {
                entryLookup = manifest.values().stream()
                        .filter(entry -> Boolean.TRUE.equals(entry.get("isEntry")))
                        .findFirst();
            }

            if (entryLookup.isEmpty()) {
                String message = "Unable to resolve frontend entry point from manifest.json";
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body(message);
            }

            Map<String, Object> entry = entryLookup.get();
            String entryFile = (String) entry.get("file");

            if (entryFile == null) {
                String message = "Manifest entry is missing the generated bundle reference";
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body(message);
            }

            List<String> cssFiles = toStringList(entry.get("css"));

            String html = buildHtmlResponse(entryFile, cssFiles);

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private List<String> toStringList(Object candidate) {
        if (candidate instanceof List<?> list) {
            return list.stream()
                    .map(Object::toString)
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private String buildHtmlResponse(String entryFile, List<String> cssFiles) {
        StringBuilder html = new StringBuilder();
        html.append("<!doctype html>\n")
                .append("<html lang=\"en\">\n")
                .append("  <head>\n")
                .append("    <meta charset=\"UTF-8\" />\n")
                .append("    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/vite.svg\" />\n")
                .append("    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n")
                .append("    <title>").append(APPLICATION_TITLE).append("</title>\n");

        for (String cssFile : cssFiles) {
            html.append("    <link rel=\"stylesheet\" crossorigin href=\"/")
                    .append(cssFile)
                    .append("\">\n");
        }

        html.append("  </head>\n")
                .append("  <body>\n")
                .append("    <div id=\"root\"></div>\n")
                .append("    <script type=\"module\" crossorigin src=\"/")
                .append(entryFile)
                .append("\"></script>\n")
                .append("  </body>\n")
                .append("</html>\n");

        return html.toString();
    }
}
