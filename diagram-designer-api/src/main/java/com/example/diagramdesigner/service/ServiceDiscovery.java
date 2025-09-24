package com.example.diagramdesigner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class ServiceDiscovery {

    private static final Logger logger = LoggerFactory.getLogger(ServiceDiscovery.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    // Cache for service URLs
    private final Map<String, String> serviceUrlCache = new ConcurrentHashMap<>();

    @Autowired
    public ServiceDiscovery(ObjectMapper objectMapper, Environment environment) {
        this.objectMapper = objectMapper;
        this.environment = environment;
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
    }

    /**
     * Discover service URL by node name from the bound service registry
     */
    public String discoverServiceUrl(String nodeName) {
        // Check cache first
        String cachedUrl = serviceUrlCache.get(nodeName);
        if (cachedUrl != null) {
            return cachedUrl;
        }

        try {
            // Get service registry URL from VCAP_SERVICES
            String registryUrl = getServiceRegistryUrl();
            if (registryUrl == null) {
                logger.debug("No service registry URL found in VCAP_SERVICES, service discovery disabled");
                return null;
            }

            // Query the registry for the service
            String serviceUrl = queryRegistryForService(registryUrl, nodeName);
            if (serviceUrl != null) {
                serviceUrlCache.put(nodeName, serviceUrl);
                logger.info("Discovered service URL for {}: {}", nodeName, serviceUrl);
            }

            return serviceUrl;

        } catch (Exception e) {
            logger.debug("Error discovering service URL for node: {} (service discovery optional)", nodeName, e);
            return null;
        }
    }

    /**
     * Get service registry URL from VCAP_SERVICES environment
     * Supports multiple service registry names for flexibility
     */
    private String getServiceRegistryUrl() {
        try {
            String vcapServices = environment.getProperty("VCAP_SERVICES");
            if (vcapServices == null) {
                logger.debug("VCAP_SERVICES not found, not running in Cloud Foundry");
                return null;
            }

            JsonNode services = objectMapper.readTree(vcapServices);

            // Try multiple possible service registry names
            String[] registryNames = {"imc-services", "service-registry", "registry", "eureka"};

            for (String registryName : registryNames) {
                if (services.has(registryName)) {
                    JsonNode serviceArray = services.get(registryName);
                    if (serviceArray.isArray() && serviceArray.size() > 0) {
                        JsonNode firstService = serviceArray.get(0);
                        JsonNode credentials = firstService.get("credentials");
                        if (credentials != null) {
                            if (credentials.has("uri")) {
                                logger.info("Found service registry '{}' at: {}", registryName, credentials.get("uri").asText());
                                return credentials.get("uri").asText();
                            } else if (credentials.has("url")) {
                                logger.info("Found service registry '{}' at: {}", registryName, credentials.get("url").asText());
                                return credentials.get("url").asText();
                            }
                        }
                    }
                }
            }

            logger.debug("No service registry binding found in VCAP_SERVICES");
            return null;

        } catch (Exception e) {
            logger.debug("Error parsing VCAP_SERVICES for service registry", e);
            return null;
        }
    }

    /**
     * Query the service registry for a specific service by name
     */
    private String queryRegistryForService(String registryUrl, String serviceName) {
        try {
            return webClient.get()
                    .uri(registryUrl + "/api/services/" + serviceName)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(5))
                    .map(this::extractServiceUrl)
                    .onErrorReturn(null)
                    .block();

        } catch (Exception e) {
            logger.debug("Error querying service registry for service: {}", serviceName, e);
            return null;
        }
    }

    /**
     * Extract service URL from registry response
     */
    private String extractServiceUrl(String response) {
        try {
            JsonNode serviceInfo = objectMapper.readTree(response);

            // Look for common URL fields in registry response
            if (serviceInfo.has("url")) {
                return serviceInfo.get("url").asText();
            } else if (serviceInfo.has("uri")) {
                return serviceInfo.get("uri").asText();
            } else if (serviceInfo.has("endpoints") && serviceInfo.get("endpoints").isArray()) {
                JsonNode endpoints = serviceInfo.get("endpoints");
                if (endpoints.size() > 0) {
                    JsonNode firstEndpoint = endpoints.get(0);
                    if (firstEndpoint.has("url")) {
                        return firstEndpoint.get("url").asText();
                    }
                }
            }

            logger.debug("No URL found in service registry response: {}", response);
            return null;

        } catch (Exception e) {
            logger.debug("Error extracting URL from service registry response", e);
            return null;
        }
    }

    /**
     * Clear the service URL cache (useful for refresh)
     */
    public void clearCache() {
        serviceUrlCache.clear();
        logger.info("Service URL cache cleared");
    }
}