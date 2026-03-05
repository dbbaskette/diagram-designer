package com.example.diagramdesigner.repository;

import com.example.diagramdesigner.model.Diagram;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class DiagramRepositoryTest {

    @Autowired
    private DiagramRepository diagramRepository;

    @Test
    void shouldSaveAndRetrieveDiagram() {
        Diagram diagram = new Diagram();
        diagram.setName("test-diagram");
        diagram.setTitle("Test Diagram");
        diagram.setConfig("{\"nodes\": []}");

        Diagram saved = diagramRepository.save(diagram);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<Diagram> found = diagramRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("test-diagram");
        assertThat(found.get().getTitle()).isEqualTo("Test Diagram");
        assertThat(found.get().getConfig()).isEqualTo("{\"nodes\": []}");
    }

    @Test
    void shouldFindByName() {
        Diagram diagram = new Diagram();
        diagram.setName("unique-name");
        diagram.setTitle("Unique Diagram");
        diagramRepository.save(diagram);

        Optional<Diagram> found = diagramRepository.findByName("unique-name");

        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Unique Diagram");
    }

    @Test
    void shouldReturnEmptyWhenNameNotFound() {
        Optional<Diagram> found = diagramRepository.findByName("nonexistent");

        assertThat(found).isEmpty();
    }
}
