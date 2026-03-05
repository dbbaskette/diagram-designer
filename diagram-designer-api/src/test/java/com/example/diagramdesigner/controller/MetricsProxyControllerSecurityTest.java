package com.example.diagramdesigner.controller;

import com.example.diagramdesigner.service.MetricsProxyService;
import com.example.diagramdesigner.service.ServiceDiscovery;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MetricsProxyController.class)
class MetricsProxyControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MetricsProxyService metricsProxyService;

    @MockBean
    private ServiceDiscovery serviceDiscovery;

    @Test
    void listDiagramsEndpointIsRemoved() throws Exception {
        mockMvc.perform(get("/api/list-diagrams"))
                .andExpect(status().isNotFound());
    }

    @Test
    void debugVcapServicesEndpointIsNotExposed() throws Exception {
        mockMvc.perform(get("/api/debug/vcap-services"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(not(containsString("VCAP_SERVICES"))))
                .andExpect(content().string(not(containsString("vcap_services"))));
    }
}
