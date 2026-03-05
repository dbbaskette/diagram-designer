package com.example.diagramdesigner.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.env.MockEnvironment;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class AuthenticationResolverTest {

    @Test
    void resolvesDistinctNodeCredentialsForSameHost() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("NODE_A_USERNAME", "user-a")
                .withProperty("NODE_A_PASSWORD", "pass-a")
                .withProperty("NODE_B_USERNAME", "user-b")
                .withProperty("NODE_B_PASSWORD", "pass-b");

        AuthenticationResolver resolver = new AuthenticationResolver(environment);

        HttpHeaders nodeAHeaders = new HttpHeaders();
        resolver.addAuthenticationHeaders(nodeAHeaders, "https://shared.example.com/metrics", "node-a");

        HttpHeaders nodeBHeaders = new HttpHeaders();
        resolver.addAuthenticationHeaders(nodeBHeaders, "https://shared.example.com/metrics", "node-b");

        HttpHeaders nodeAHeadersAgain = new HttpHeaders();
        resolver.addAuthenticationHeaders(nodeAHeadersAgain, "https://shared.example.com/metrics", "node-a");

        assertEquals(expectedBasicAuth("user-a", "pass-a"), nodeAHeaders.getFirst(HttpHeaders.AUTHORIZATION));
        assertEquals(expectedBasicAuth("user-b", "pass-b"), nodeBHeaders.getFirst(HttpHeaders.AUTHORIZATION));
        assertEquals(expectedBasicAuth("user-a", "pass-a"), nodeAHeadersAgain.getFirst(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void getAuthFingerprintDiffersForDifferentNodeCredentials() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("NODE_A_USERNAME", "user-a")
                .withProperty("NODE_A_PASSWORD", "pass-a")
                .withProperty("NODE_B_USERNAME", "user-b")
                .withProperty("NODE_B_PASSWORD", "pass-b");

        AuthenticationResolver resolver = new AuthenticationResolver(environment);

        String fpA = resolver.getAuthFingerprint("https://shared.example.com/metrics", "node-a");
        String fpB = resolver.getAuthFingerprint("https://shared.example.com/metrics", "node-b");
        String fpAAgain = resolver.getAuthFingerprint("https://shared.example.com/metrics", "node-a");

        assertNotEquals(fpA, fpB, "Different credentials should produce different fingerprints");
        assertEquals(fpA, fpAAgain, "Same credentials should produce the same fingerprint");
    }

    @Test
    void getAuthFingerprintReturnsEmptyForNoAuth() {
        MockEnvironment environment = new MockEnvironment();
        AuthenticationResolver resolver = new AuthenticationResolver(environment);

        String fp = resolver.getAuthFingerprint("https://unknown.example.com/metrics", null);
        assertEquals("", fp);
    }

    private String expectedBasicAuth(String username, String password) {
        String credentials = username + ":" + password;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes());
    }
}
