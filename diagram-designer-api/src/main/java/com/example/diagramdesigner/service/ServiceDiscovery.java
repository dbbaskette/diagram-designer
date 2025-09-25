package com.example.diagramdesigner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class ServiceDiscovery {

    private static final Logger logger = LoggerFactory.getLogger(ServiceDiscovery.class);

    private final DiscoveryClient discoveryClient;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    // Cache for service URLs
    private final Map<String, String> serviceUrlCache = new ConcurrentHashMap<>();

    @Autowired
    public ServiceDiscovery(DiscoveryClient discoveryClient, ObjectMapper objectMapper, Environment environment) {
        this.discoveryClient = discoveryClient;
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
            // Try Spring Cloud DiscoveryClient first (best approach)
            String serviceUrl = discoverServiceViaDiscoveryClient(nodeName);
            if (serviceUrl != null) {
                serviceUrlCache.put(nodeName, serviceUrl);
                logger.info("Discovered service URL using DiscoveryClient for {}: {}", nodeName, serviceUrl);
                return serviceUrl;
            }

            // Try Cloud Foundry URL patterns as fallback
            String cfUrl = tryCloudFoundryUrlPattern(nodeName);
            if (cfUrl != null) {
                serviceUrlCache.put(nodeName, cfUrl);
                logger.info("Discovered service URL using CF pattern for {}: {}", nodeName, cfUrl);
                return cfUrl;
            }

            // Final fallback: manual registry query
            String registryUrl = getServiceRegistryUrl();
            if (registryUrl != null) {
                String queryResult = queryRegistryForService(registryUrl, nodeName);
                if (queryResult != null) {
                    serviceUrlCache.put(nodeName, queryResult);
                    logger.info("Discovered service URL using registry query for {}: {}", nodeName, queryResult);
                    return queryResult;
                }
            }

            logger.debug("Service discovery failed for: {} - no service found", nodeName);
            return null;

        } catch (Exception e) {
            logger.debug("Error discovering service URL for node: {} (service discovery optional)", nodeName, e);
            return null;
        }
    }

    /**
     * Use Spring Cloud DiscoveryClient to find services
     * This is the recommended approach for Spring Cloud applications
     */
    private String discoverServiceViaDiscoveryClient(String serviceName) {
        try {
            // Try exact service name first
            List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
            if (instances != null && !instances.isEmpty()) {
                ServiceInstance instance = instances.get(0);
                String serviceUrl = instance.getUri().toString();
                logger.debug("Found service {} using DiscoveryClient: {}", serviceName, serviceUrl);
                return serviceUrl;
            }

            // Try case variations based on common patterns
            String[] variations = {
                serviceName.toLowerCase(),
                serviceName.toLowerCase().replace("_", "-"),
                serviceName.toUpperCase(),
                serviceName.toUpperCase().replace("-", "_")
            };

            for (String variation : variations) {
                if (!variation.equals(serviceName)) { // Skip if same as original
                    instances = discoveryClient.getInstances(variation);
                    if (instances != null && !instances.isEmpty()) {
                        ServiceInstance instance = instances.get(0);
                        String serviceUrl = instance.getUri().toString();
                        logger.debug("Found service {} using variation '{}' via DiscoveryClient: {}", serviceName, variation, serviceUrl);
                        return serviceUrl;
                    }
                }
            }

            logger.debug("Service '{}' not found via DiscoveryClient", serviceName);
            return null;

        } catch (Exception e) {
            logger.debug("Error using DiscoveryClient to find service {}: {}", serviceName, e.getMessage());
            return null;
        }
    }

    /**
     * Try Cloud Foundry URL patterns based on the current app's domain
     */
    private String tryCloudFoundryUrlPattern(String serviceName) {
        try {
            // Get the current app's domain from VCAP_APPLICATION
            String vcapApplication = environment.getProperty("VCAP_APPLICATION");
            logger.debug("VCAP_APPLICATION found: {}", vcapApplication != null);
            if (vcapApplication != null) {
                JsonNode appInfo = objectMapper.readTree(vcapApplication);
                JsonNode uris = appInfo.get("uris");
                if (uris != null && uris.isArray() && uris.size() > 0) {
                    String firstUri = uris.get(0).asText();
                    // Extract domain from current app URI
                    String domain = firstUri.substring(firstUri.indexOf('.') + 1);
                    logger.debug("Extracted domain: {} from URI: {}", domain, firstUri);

                    // Try common service name patterns (case variations)
                    String[] patterns = {
                        serviceName.toLowerCase() + "." + domain,
                        serviceName.toLowerCase().replace("_", "-") + "." + domain,
                        serviceName.toLowerCase().replace("-", "") + "." + domain,
                        serviceName.toUpperCase().replace("_", "-").toLowerCase() + "." + domain,
                        serviceName + "." + domain,
                        // Additional patterns for complex service names
                        extractSimpleServiceName(serviceName).toLowerCase() + "." + domain
                    };

                    for (String pattern : patterns) {
                        String testUrl = "https://" + pattern;
                        logger.debug("Testing CF URL pattern: {} for service: {}", testUrl, serviceName);
                        if (testServiceUrl(testUrl)) {
                            logger.info("Successfully found service at CF URL: {}", testUrl);
                            return testUrl;
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.debug("Error trying CF URL patterns for service: {}", serviceName, e);
        }
        return null;
    }

    /**
     * Test if a service URL is reachable
     */
    private boolean testServiceUrl(String url) {
        try {
            return webClient.get()
                    .uri(url + "/actuator/health")
                    .retrieve()
                    .toBodilessEntity()
                    .timeout(Duration.ofSeconds(5))
                    .map(response -> response.getStatusCode().is2xxSuccessful())
                    .onErrorReturn(false)
                    .block();
        } catch (Exception e) {
            logger.debug("Service URL test failed for: {}", url);
            return false;
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

            // Try multiple possible service registry names and labels
            String[] registryNames = {"service-registry", "registry", "eureka", "p.service-registry"};

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
     * Tries multiple API endpoints as different registries use different formats
     */
    private String queryRegistryForService(String registryUrl, String serviceName) {
        try {
            // Try Eureka XML API first (most common for Spring Cloud Services)
            String eurekaPath = "/eureka/apps/" + serviceName.toUpperCase();
            try {
                String result = webClient.get()
                        .uri(registryUrl + eurekaPath)
                        .header("Accept", "application/xml")
                        .retrieve()
                        .bodyToMono(String.class)
                        .timeout(Duration.ofSeconds(5))
                        .map(response -> extractServiceUrlFromXmlResponse(response, serviceName))
                        .onErrorReturn(null)
                        .block();

                if (result != null) {
                    logger.debug("Found service {} using Eureka XML API: {}", serviceName, eurekaPath);
                    return result;
                }
            } catch (Exception e) {
                logger.debug("Failed to query {} with Eureka XML API: {}", serviceName, e.getMessage());
            }

            // Try different registry API endpoints as fallback
            String[] apiPaths = {
                "/api/services/" + serviceName,
                "/api/applications/" + serviceName,
                "/apps/" + serviceName.toUpperCase(),
                "/services/" + serviceName
            };

            for (String apiPath : apiPaths) {
                try {
                    String result = webClient.get()
                            .uri(registryUrl + apiPath)
                            .retrieve()
                            .bodyToMono(String.class)
                            .timeout(Duration.ofSeconds(5))
                            .map(response -> extractServiceUrlFromResponse(response, serviceName))
                            .onErrorReturn(null)
                            .block();

                    if (result != null) {
                        logger.debug("Found service {} using API path: {}", serviceName, apiPath);
                        return result;
                    }
                } catch (Exception e) {
                    logger.debug("Failed to query {} with path {}: {}", serviceName, apiPath, e.getMessage());
                }
            }

            // If direct queries fail, try listing all services and finding a match
            return queryAllServicesForMatch(registryUrl, serviceName);

        } catch (Exception e) {
            logger.debug("Error querying service registry for service: {}", serviceName, e);
            return null;
        }
    }

    /**
     * Query all services from registry and find matching service
     */
    private String queryAllServicesForMatch(String registryUrl, String serviceName) {
        try {
            String[] listPaths = {
                "/eureka/apps",
                "/api/services",
                "/api/applications",
                "/apps",
                "/services"
            };

            for (String listPath : listPaths) {
                try {
                    String allServicesResponse = webClient.get()
                            .uri(registryUrl + listPath)
                            .retrieve()
                            .bodyToMono(String.class)
                            .timeout(Duration.ofSeconds(5))
                            .onErrorReturn(null)
                            .block();

                    if (allServicesResponse != null) {
                        String matchedUrl = findServiceInListResponse(allServicesResponse, serviceName);
                        if (matchedUrl != null) {
                            logger.debug("Found service {} in list response from {}", serviceName, listPath);
                            return matchedUrl;
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Failed to query service list with path {}: {}", listPath, e.getMessage());
                }
            }

            return null;
        } catch (Exception e) {
            logger.debug("Error querying all services for match: {}", serviceName, e);
            return null;
        }
    }

    /**
     * Extract service URL from registry response
     */
    private String extractServiceUrlFromResponse(String response, String serviceName) {
        try {
            JsonNode serviceInfo = objectMapper.readTree(response);

            // Try different response formats
            String url = extractUrlFromStandardResponse(serviceInfo);
            if (url != null) return url;

            url = extractUrlFromEurekaResponse(serviceInfo, serviceName);
            if (url != null) return url;

            logger.debug("No URL found in service registry response for {}: {}", serviceName, response.substring(0, Math.min(200, response.length())));
            return null;

        } catch (Exception e) {
            logger.debug("Error extracting URL from service registry response for {}", serviceName, e);
            return null;
        }
    }

    /**
     * Extract URL from standard registry response format
     */
    private String extractUrlFromStandardResponse(JsonNode serviceInfo) {
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
        return null;
    }

    /**
     * Extract URL from Eureka response format
     */
    private String extractUrlFromEurekaResponse(JsonNode serviceInfo, String serviceName) {
        try {
            // Eureka format: {"application": {"instance": [...]}}
            if (serviceInfo.has("application")) {
                JsonNode application = serviceInfo.get("application");
                if (application.has("instance")) {
                    JsonNode instances = application.get("instance");
                    if (instances.isArray() && instances.size() > 0) {
                        JsonNode firstInstance = instances.get(0);
                        return extractInstanceUrl(firstInstance);
                    }
                }
            }

            // Direct instance format: {"instance": [...]}
            if (serviceInfo.has("instance")) {
                JsonNode instances = serviceInfo.get("instance");
                if (instances.isArray() && instances.size() > 0) {
                    JsonNode firstInstance = instances.get(0);
                    return extractInstanceUrl(firstInstance);
                }
            }

            return null;
        } catch (Exception e) {
            logger.debug("Error extracting Eureka URL for {}", serviceName, e);
            return null;
        }
    }

    /**
     * Extract URL from Eureka instance
     */
    private String extractInstanceUrl(JsonNode instance) {
        if (instance.has("homePageUrl")) {
            return instance.get("homePageUrl").asText();
        } else if (instance.has("statusPageUrl")) {
            String statusUrl = instance.get("statusPageUrl").asText();
            // Remove /actuator/info or similar paths to get base URL
            return statusUrl.replaceAll("/actuator.*$", "").replaceAll("/info.*$", "");
        } else if (instance.has("healthCheckUrl")) {
            String healthUrl = instance.get("healthCheckUrl").asText();
            return healthUrl.replaceAll("/actuator/health.*$", "").replaceAll("/health.*$", "");
        } else if (instance.has("hostName") && instance.has("port")) {
            String protocol = instance.has("securePort") && instance.get("securePort").has("@enabled")
                            && instance.get("securePort").get("@enabled").asBoolean() ? "https" : "http";
            String hostname = instance.get("hostName").asText();
            JsonNode portNode = instance.get("port");
            int port = portNode.has("$") ? portNode.get("$").asInt() : portNode.asInt();
            return protocol + "://" + hostname + (port != 80 && port != 443 ? ":" + port : "");
        }
        return null;
    }

    /**
     * Find service URL in a list response containing multiple services
     */
    private String findServiceInListResponse(String response, String serviceName) {
        try {
            JsonNode listResponse = objectMapper.readTree(response);

            // Handle different list response formats
            if (listResponse.has("applications") && listResponse.get("applications").has("application")) {
                JsonNode applications = listResponse.get("applications").get("application");
                return findServiceInApplicationList(applications, serviceName);
            }

            if (listResponse.has("application") && listResponse.get("application").isArray()) {
                return findServiceInApplicationList(listResponse.get("application"), serviceName);
            }

            if (listResponse.isArray()) {
                return findServiceInApplicationList(listResponse, serviceName);
            }

            return null;
        } catch (Exception e) {
            logger.debug("Error finding service {} in list response", serviceName, e);
            return null;
        }
    }

    /**
     * Find service in application list by name (case-insensitive)
     */
    private String findServiceInApplicationList(JsonNode applications, String serviceName) {
        if (!applications.isArray()) return null;

        for (JsonNode app : applications) {
            if (app.has("name")) {
                String appName = app.get("name").asText();
                if (appName.equalsIgnoreCase(serviceName)) {
                    if (app.has("instance")) {
                        JsonNode instances = app.get("instance");
                        if (instances.isArray() && instances.size() > 0) {
                            return extractInstanceUrl(instances.get(0));
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extract service URL from Eureka XML response
     * Expected format:
     * <application>
     *   <name>SERVICE-NAME</name>
     *   <instance>
     *     <hostName>service.apps.example.com</hostName>
     *     <instanceId>service.apps.example.com:guid</instanceId>
     *   </instance>
     * </application>
     */
    private String extractServiceUrlFromXmlResponse(String xmlResponse, String serviceName) {
        try {
            // Simple XML parsing for hostName - more robust than full XML parser
            if (xmlResponse.contains("<hostName>") && xmlResponse.contains("</hostName>")) {
                int start = xmlResponse.indexOf("<hostName>") + "<hostName>".length();
                int end = xmlResponse.indexOf("</hostName>", start);
                if (start > 0 && end > start) {
                    String hostName = xmlResponse.substring(start, end).trim();
                    if (!hostName.isEmpty()) {
                        String serviceUrl = "https://" + hostName;
                        logger.debug("Extracted hostname from XML for {}: {}", serviceName, hostName);
                        return serviceUrl;
                    }
                }
            }

            logger.debug("No valid hostName found in XML response for {}", serviceName);
            return null;

        } catch (Exception e) {
            logger.debug("Error extracting URL from XML response for {}", serviceName, e);
            return null;
        }
    }

    /**
     * Extract simple service name from complex service names
     * Removes common prefixes to get to core service name
     */
    private String extractSimpleServiceName(String serviceName) {
        // Remove common prefixes (customize based on your naming conventions)
        String cleaned = serviceName;
        if (cleaned.contains("-")) {
            String[] parts = cleaned.split("-");
            if (parts.length > 1) {
                // Return everything after the first dash for complex names like "prefix-service-name"
                return String.join("-", Arrays.copyOfRange(parts, 1, parts.length));
            }
        }
        return cleaned;
    }

    /**
     * Clear the service URL cache (useful for refresh)
     */
    public void clearCache() {
        serviceUrlCache.clear();
        logger.info("Service URL cache cleared");
    }
}