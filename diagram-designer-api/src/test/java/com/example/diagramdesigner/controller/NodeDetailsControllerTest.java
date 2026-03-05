package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NodeDetailsController.class)
class NodeDetailsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConfigurationProcessor configurationProcessor;

    @ParameterizedTest
    @ValueSource(strings = {
            ".hidden",
            "-startsWithDash",
            "has spaces",
            "has<html>"
    })
    void rejectsInvalidNodeNames(String nodeName) throws Exception {
        mockMvc.perform(get("/api/node-details/" + nodeName))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("Invalid node name")));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "my-service",
            "MyNode01",
            "node.name",
            "service_name",
            "a"
    })
    void acceptsValidNodeNames(String nodeName) throws Exception {
        // Valid names should pass validation (will get 404 since no resource exists)
        mockMvc.perform(get("/api/node-details/" + nodeName))
                .andExpect(status().isNotFound());
    }
}
