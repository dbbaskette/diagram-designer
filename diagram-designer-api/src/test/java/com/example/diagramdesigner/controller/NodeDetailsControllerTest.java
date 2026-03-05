package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.ConfigurationProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

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
            "has<html>",
            "node.name"
    })
    void rejectsInvalidNodeNames(String nodeName) throws Exception {
        mockMvc.perform(get("/api/node-details/" + nodeName))
                .andExpect(status().is4xxClientError());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "my-service",
            "MyNode01",
            "service_name",
            "a"
    })
    void acceptsValidNodeNames(String nodeName) throws Exception {
        // Valid names should pass validation (will get 404 since no resource exists)
        mockMvc.perform(get("/api/node-details/" + nodeName))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "%2E%2E%2Fsecret",
            "%2Fetc%2Fpasswd"
    })
    void rejectsUrlEncodedTraversalAttempts(String encodedNodeName) throws Exception {
        mockMvc.perform(get("/api/node-details/{nodeName}", encodedNodeName))
                .andExpect(status().is4xxClientError());
    }

    @org.junit.jupiter.api.Test
    void acceptsMaximumLengthNodeName() throws Exception {
        String nodeName64 = "a".repeat(64);

        mockMvc.perform(get("/api/node-details/{nodeName}", nodeName64))
                .andExpect(status().isNotFound());
    }

    @org.junit.jupiter.api.Test
    void rejectsNodeNameExceedingMaximumLength() throws Exception {
        String nodeName65 = "a".repeat(65);

        mockMvc.perform(get("/api/node-details/{nodeName}", nodeName65))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
