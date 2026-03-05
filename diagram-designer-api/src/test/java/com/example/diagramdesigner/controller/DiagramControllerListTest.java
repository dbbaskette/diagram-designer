package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.config.CacheProperties;
import com.example.diagramdesigner.dto.DiagramRequest;
import com.example.diagramdesigner.dto.DiagramResponse;
import com.example.diagramdesigner.model.Diagram;
import com.example.diagramdesigner.service.ConfigsDirectoryResolver;
import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.example.diagramdesigner.service.DiagramService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiagramControllerListTest {

    @Mock
    private ConfigurationProcessor configurationProcessor;

    @Mock
    private DiagramService diagramService;

    @Mock
    private ConfigsDirectoryResolver configsDirectoryResolver;

    private DiagramController controller;

    @BeforeEach
    void setUp() {
        CacheProperties cacheProperties = new CacheProperties();
        controller = new DiagramController(configurationProcessor, diagramService, configsDirectoryResolver, cacheProperties);
    }

    @Test
    void listDiagrams_returnsDbEntriesWhenPresent() {
        Diagram d1 = makeDiagram("my-diagram", "My Diagram");
        Diagram d2 = makeDiagram("other-diagram", "Other");
        when(diagramService.listDiagrams()).thenReturn(List.of(d1, d2));

        ResponseEntity<List<String>> response = controller.listDiagrams();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsExactly("my-diagram.json", "other-diagram.json");
    }

    @Test
    void listDiagrams_fallsBackToFileScanWhenDbEmpty() {
        when(diagramService.listDiagrams()).thenReturn(Collections.emptyList());

        ResponseEntity<List<String>> response = controller.listDiagrams();

        // Should not fail — returns whatever the file scan finds (may be empty list or file-based results)
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void createDbDiagram_returnsProcessedConfig() {
        Diagram created = makeDiagram("new-diagram", "New Diagram");
        created.setId(1L);
        created.setConfig("{\"url\":\"${HOST}\"}");

        when(diagramService.createDiagram(any(DiagramRequest.class))).thenReturn(created);
        when(diagramService.getProcessedConfig(created)).thenReturn("{\"url\":\"https://processed\"}");

        DiagramRequest request = new DiagramRequest();
        request.setName("new-diagram");
        request.setTitle("New Diagram");
        request.setConfig("{\"url\":\"${HOST}\"}");

        MockHttpServletRequest servletRequest = new MockHttpServletRequest("POST", "/api/diagrams/db");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(servletRequest));

        ResponseEntity<DiagramResponse> response;
        try {
            response = controller.createDbDiagram(request);
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getConfig()).isEqualTo("{\"url\":\"https://processed\"}");
    }

    @Test
    void updateDbDiagram_returnsProcessedConfig() {
        Diagram updated = makeDiagram("existing", "Existing");
        updated.setId(7L);
        updated.setConfig("{\"target\":\"${my-service}\"}");

        when(diagramService.updateDiagram(any(Long.class), any(DiagramRequest.class))).thenReturn(updated);
        when(diagramService.getProcessedConfig(updated)).thenReturn("{\"target\":\"https://service\"}");

        DiagramRequest request = new DiagramRequest();
        request.setName("existing");
        request.setTitle("Existing");
        request.setConfig("{\"target\":\"${my-service}\"}");

        ResponseEntity<DiagramResponse> response = controller.updateDbDiagram(7L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getConfig()).isEqualTo("{\"target\":\"https://service\"}");
    }

    private Diagram makeDiagram(String name, String title) {
        Diagram d = new Diagram();
        d.setName(name);
        d.setTitle(title);
        d.setConfig("{\"nodes\":[]}");
        return d;
    }
}
