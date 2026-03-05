package com.example.diagramdesigner.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DiagramLifecycleTest {

    @Test
    void onCreateSetsCreatedAtAndUpdatedAt() {
        Diagram diagram = new Diagram();

        diagram.onCreate();

        assertNotNull(diagram.getCreatedAt());
        assertNotNull(diagram.getUpdatedAt());
    }

    @Test
    void onUpdateRefreshesUpdatedAt() {
        Diagram diagram = new Diagram();

        LocalDateTime originalCreatedAt = LocalDateTime.now().minusMinutes(2);
        LocalDateTime originalUpdatedAt = LocalDateTime.now().minusMinutes(1);
        diagram.setCreatedAt(originalCreatedAt);
        diagram.setUpdatedAt(originalUpdatedAt);

        diagram.onUpdate();

        assertEquals(originalCreatedAt, diagram.getCreatedAt());
        assertTrue(diagram.getUpdatedAt().isAfter(originalUpdatedAt));
    }
}
