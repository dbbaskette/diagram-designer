package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.model.Diagram;
import com.example.diagramdesigner.repository.DiagramRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DiagramControllerDbTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DiagramRepository diagramRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        diagramRepository.deleteAll();
    }

    @Test
    void listDbDiagramsReturnsEmptyListWhenNoDiagrams() throws Exception {
        mockMvc.perform(get("/api/diagrams/db"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listDbDiagramsReturnsSummaryWithoutConfig() throws Exception {
        Diagram diagram = new Diagram();
        diagram.setName("test-diagram");
        diagram.setTitle("Test Title");
        diagram.setConfig("{\"nodes\":[]}");
        diagramRepository.save(diagram);

        mockMvc.perform(get("/api/diagrams/db"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("test-diagram")))
                .andExpect(jsonPath("$[0].title", is("Test Title")))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].updatedAt").exists())
                .andExpect(jsonPath("$[0].config").doesNotExist());
    }

    @Test
    void getDbDiagramReturnsProcessedConfig() throws Exception {
        Diagram diagram = new Diagram();
        diagram.setName("my-diagram");
        diagram.setTitle("My Diagram");
        diagram.setConfig("{\"nodes\":[{\"name\":\"node1\"}]}");
        diagram = diagramRepository.save(diagram);

        mockMvc.perform(get("/api/diagrams/db/{id}", diagram.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(diagram.getId().intValue())))
                .andExpect(jsonPath("$.name", is("my-diagram")))
                .andExpect(jsonPath("$.config").isString());
    }

    @Test
    void getDbDiagramReturns404ForMissingId() throws Exception {
        mockMvc.perform(get("/api/diagrams/db/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createDbDiagramReturns201WithLocationHeader() throws Exception {
        String body = """
                {"name":"new-diagram","title":"New","config":"{\\"key\\":\\"value\\"}"}
                """;

        mockMvc.perform(post("/api/diagrams/db")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name", is("new-diagram")))
                .andExpect(jsonPath("$.title", is("New")))
                .andExpect(jsonPath("$.config", is("{\"key\":\"value\"}")));
    }

    @Test
    void createDbDiagramReturns400WhenNameMissing() throws Exception {
        String body = """
                {"title":"No Name","config":"{}"}
                """;

        mockMvc.perform(post("/api/diagrams/db")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createDbDiagramReturns400WhenConfigMissing() throws Exception {
        String body = """
                {"name":"missing-config","title":"Oops"}
                """;

        mockMvc.perform(post("/api/diagrams/db")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateDbDiagramReturnsUpdatedDiagram() throws Exception {
        Diagram diagram = new Diagram();
        diagram.setName("original");
        diagram.setTitle("Original Title");
        diagram.setConfig("{\"v\":1}");
        diagram = diagramRepository.save(diagram);

        String body = """
                {"name":"updated","title":"Updated Title","config":"{\\"v\\":2}"}
                """;

        mockMvc.perform(put("/api/diagrams/db/{id}", diagram.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("updated")))
                .andExpect(jsonPath("$.title", is("Updated Title")));
    }

    @Test
    void updateDbDiagramReturns404ForMissingId() throws Exception {
        String body = """
                {"name":"ghost","config":"{}"}
                """;

        mockMvc.perform(put("/api/diagrams/db/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteDbDiagramReturns204() throws Exception {
        Diagram diagram = new Diagram();
        diagram.setName("to-delete");
        diagram.setConfig("{}");
        diagram = diagramRepository.save(diagram);

        mockMvc.perform(delete("/api/diagrams/db/{id}", diagram.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/diagrams/db/{id}", diagram.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteDbDiagramReturns404ForMissingId() throws Exception {
        mockMvc.perform(delete("/api/diagrams/db/999"))
                .andExpect(status().isNotFound());
    }
}
