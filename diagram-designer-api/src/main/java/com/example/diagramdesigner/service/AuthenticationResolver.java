package com.example.diagramdesigner.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthenticationResolver {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationResolver.class);

    private final Environment environment;
    private final Map<String, AuthConfig> authCache = new ConcurrentHashMap<>();

    public AuthenticationResolver(Environment environment) {
        this.environment = environment;
    }

    public void addAuthenticationHeaders(HttpHeaders headers, String targetUrl, String nodeName) {
        try {
            URI uri = URI.create(targetUrl);
            String host = uri.getHost();

            if (host == null) {
                return;
            }

            AuthConfig authConfig = resolveAuthentication(host, nodeName);
            if (authConfig != null) {
                applyAuthentication(headers, authConfig, host);
            }

        } catch (Exception e) {
            logger.warn("Error resolving authentication for URL: {}", targetUrl, e);
        }
    }

    private AuthConfig resolveAuthentication(String host, String nodeName) {
        logger.debug("Resolving authentication for host: {} (node: {})", host, nodeName);

        AuthConfig cached = authCache.get(host);
        if (cached != null) {
            logger.debug("Using cached authentication for host: {}", host);
            return cached;
        }

        AuthConfig config = tryResolveInOrder(host, nodeName);

        if (config != null) {
            logger.debug("Resolved authentication for host: {} using type: {}", host, config.type());
            authCache.put(host, config);
        } else {
            logger.debug("No authentication found for host: {}", host);
        }

        return config;
    }

    private AuthConfig tryResolveInOrder(String host, String nodeName) {
        // Pattern 0: Node name (highest priority if provided)
        if (nodeName != null && !nodeName.trim().isEmpty()) {
            String nodeKey = nodeName.toUpperCase().replace(".", "_").replace("-", "_");
            AuthConfig config = tryResolveByPrefix(nodeKey);
            if (config != null) return config;
        }

        // Pattern 1: Exact host match (e.g., RABBITMQ_EXAMPLE_COM_USERNAME)
        String hostKey = host.toUpperCase().replace(".", "_").replace("-", "_");
        AuthConfig config = tryResolveByPrefix(hostKey);
        if (config != null) return config;

        // Pattern 2: Service name extraction (e.g., rabbitmq.example.com -> RABBITMQ_*)
        String[] parts = host.split("\\.");
        if (parts.length > 0) {
            String serviceKey = parts[0].toUpperCase().replace("-", "_");
            config = tryResolveByPrefix(serviceKey);
            if (config != null) return config;
        }

        // Pattern 3: Try common service prefixes
        for (String prefix : getCommonPrefixes(host)) {
            config = tryResolveByPrefix(prefix);
            if (config != null) return config;
        }

        return null;
    }

    private AuthConfig tryResolveByPrefix(String prefix) {
        String username = environment.getProperty(prefix + "_USERNAME");
        String password = environment.getProperty(prefix + "_PASSWORD");
        String apiKey = environment.getProperty(prefix + "_API_KEY");
        String bearerToken = environment.getProperty(prefix + "_BEARER_TOKEN");
        String clientId = environment.getProperty(prefix + "_CLIENT_ID");

        // Basic auth (username + password)
        if (StringUtils.hasText(username) && StringUtils.hasText(password)) {
            logger.debug("Found basic auth for prefix: {}", prefix);
            return new AuthConfig("basic", username, password, null, null, null);
        }

        // API Key
        if (StringUtils.hasText(apiKey)) {
            logger.debug("Found API key for prefix: {}", prefix);
            String headerName = environment.getProperty(prefix + "_API_HEADER", "X-API-Key");
            return new AuthConfig("apikey", null, null, apiKey, headerName, null);
        }

        // Bearer token
        if (StringUtils.hasText(bearerToken)) {
            logger.debug("Found bearer token for prefix: {}", prefix);
            return new AuthConfig("bearer", null, null, null, null, bearerToken);
        }

        // Client ID (custom header)
        if (StringUtils.hasText(clientId)) {
            logger.debug("Found client ID for prefix: {}", prefix);
            String headerName = environment.getProperty(prefix + "_CLIENT_HEADER", "X-Client-ID");
            return new AuthConfig("custom", null, null, null, headerName, clientId);
        }

        return null;
    }

    private String[] getCommonPrefixes(String host) {
        // Generic approach - try common patterns based on hostname parts
        java.util.Set<String> prefixes = new java.util.HashSet<>();

        // Split hostname and try each part as a potential service identifier
        String[] parts = host.split("[.-]");
        for (String part : parts) {
            if (part.length() > 2) { // Skip very short parts
                prefixes.add(part.toUpperCase());
            }
        }

        return prefixes.toArray(new String[0]);
    }

    private void applyAuthentication(HttpHeaders headers, AuthConfig config, String host) {
        switch (config.type()) {
            case "basic":
                String credentials = config.username() + ":" + config.password();
                String encoded = Base64.getEncoder().encodeToString(credentials.getBytes());
                headers.add("Authorization", "Basic " + encoded);
                logger.debug("Added Basic authentication for host: {}", host);
                break;

            case "bearer":
                headers.add("Authorization", "Bearer " + config.bearerToken());
                logger.debug("Added Bearer token authentication for host: {}", host);
                break;

            case "apikey":
                headers.add(config.headerName(), config.apiKey());
                logger.debug("Added API key authentication for host: {} (header: {})", host, config.headerName());
                break;

            case "custom":
                headers.add(config.headerName(), config.bearerToken());
                logger.debug("Added custom header authentication for host: {} (header: {})", host, config.headerName());
                break;

            default:
                logger.warn("Unknown authentication type: {}", config.type());
        }
    }

    // Simple record to hold auth configuration
    private record AuthConfig(String type, String username, String password,
                             String apiKey, String headerName, String bearerToken) {}
}