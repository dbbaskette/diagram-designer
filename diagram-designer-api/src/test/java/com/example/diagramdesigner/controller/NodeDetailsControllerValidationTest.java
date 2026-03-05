package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NodeDetailsController.class)
class NodeDetailsControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConfigurationProcessor configurationProcessor;

    @Test
    void rejectsInvalidNodeNamePathVariable() throws Exception {
        mockMvc.perform(get("/api/node-details/{nodeName}", "invalid.name"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void nodeDetailsListEndpointIsRemoved() throws Exception {
        mockMvc.perform(get("/api/node-details"))
                .andExpect(status().isNotFound());
    }
}
