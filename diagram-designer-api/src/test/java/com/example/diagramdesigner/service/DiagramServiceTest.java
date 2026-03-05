package com.example.diagramdesigner.service;

import com.example.diagramdesigner.dto.DiagramRequest;
import com.example.diagramdesigner.model.Diagram;
import com.example.diagramdesigner.repository.DiagramRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiagramServiceTest {

    @Mock
    private DiagramRepository diagramRepository;

    @Mock
    private ConfigurationProcessor configurationProcessor;

    @Mock
    private ConfigsDirectoryResolver configsDirectoryResolver;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private DiagramService diagramService;

    @BeforeEach
    void setUp() {
        diagramService = new DiagramService(diagramRepository, configurationProcessor,
                objectMapper, configsDirectoryResolver);
    }

    // --- CRUD Tests ---

    @Test
    void listDiagrams_returnsAll() {
        when(diagramRepository.findAll()).thenReturn(List.of(
                makeDiagram(1L, "d1", "Diagram 1"),
                makeDiagram(2L, "d2", "Diagram 2")));

        List<Diagram> result = diagramService.listDiagrams();

        assertThat(result).hasSize(2);
        verify(diagramRepository).findAll();
    }

    @Test
    void getDiagram_found() {
        when(diagramRepository.findById(1L)).thenReturn(Optional.of(makeDiagram(1L, "test", "Test")));

        assertThat(diagramService.getDiagram(1L).getName()).isEqualTo("test");
    }

    @Test
    void getDiagram_notFound_throws404() {
        when(diagramRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> diagramService.getDiagram(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void getDiagramByName_found() {
        when(diagramRepository.findByName("my-diagram"))
                .thenReturn(Optional.of(makeDiagram(1L, "my-diagram", "My Diagram")));

        assertThat(diagramService.getDiagramByName("my-diagram").getTitle()).isEqualTo("My Diagram");
    }

    @Test
    void getDiagramByName_notFound_throws404() {
        when(diagramRepository.findByName("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> diagramService.getDiagramByName("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void createDiagram_savesAndReturns() {
        DiagramRequest dto = new DiagramRequest();
        dto.setName("new-diagram");
        dto.setTitle("New Diagram");
        dto.setConfig("{\"nodes\":[]}");

        when(diagramRepository.findByName("new-diagram")).thenReturn(Optional.empty());

        when(diagramRepository.save(any(Diagram.class))).thenAnswer(inv -> {
            Diagram d = inv.getArgument(0);
            d.setId(1L);
            return d;
        });

        Diagram result = diagramService.createDiagram(dto);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("new-diagram");
        assertThat(result.getConfig()).isEqualTo("{\"nodes\":[]}");
    }

    @Test
    void createDiagram_duplicateName_throws409() {
        DiagramRequest dto = new DiagramRequest();
        dto.setName("existing");
        dto.setTitle("Existing");
        dto.setConfig("{}");

        when(diagramRepository.findByName("existing"))
                .thenReturn(Optional.of(makeDiagram(5L, "existing", "Existing")));

        assertThatThrownBy(() -> diagramService.createDiagram(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(diagramRepository, never()).save(any(Diagram.class));
    }

    @Test
    void updateDiagram_updatesExisting() {
        when(diagramRepository.findById(1L)).thenReturn(Optional.of(makeDiagram(1L, "old", "Old")));
        when(diagramRepository.findByName("new-name")).thenReturn(Optional.empty());
        when(diagramRepository.save(any(Diagram.class))).thenAnswer(inv -> inv.getArgument(0));

        DiagramRequest dto = new DiagramRequest();
        dto.setName("new-name");
        dto.setTitle("New Title");
        dto.setConfig("{\"updated\":true}");

        Diagram result = diagramService.updateDiagram(1L, dto);

        assertThat(result.getName()).isEqualTo("new-name");
        assertThat(result.getTitle()).isEqualTo("New Title");
        assertThat(result.getConfig()).isEqualTo("{\"updated\":true}");
    }

    @Test
    void updateDiagram_duplicateNameOnDifferentDiagram_throws409() {
        when(diagramRepository.findById(1L)).thenReturn(Optional.of(makeDiagram(1L, "old", "Old")));
        when(diagramRepository.findByName("existing"))
                .thenReturn(Optional.of(makeDiagram(2L, "existing", "Existing")));

        DiagramRequest dto = new DiagramRequest();
        dto.setName("existing");
        dto.setTitle("Updated Title");
        dto.setConfig("{}");

        assertThatThrownBy(() -> diagramService.updateDiagram(1L, dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(diagramRepository, never()).save(any(Diagram.class));
    }

    @Test
    void updateDiagram_notFound_throws404() {
        when(diagramRepository.findById(99L)).thenReturn(Optional.empty());

        DiagramRequest dto = new DiagramRequest();
        dto.setName("x");
        dto.setConfig("{}");

        assertThatThrownBy(() -> diagramService.updateDiagram(99L, dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void deleteDiagram_existingId() {
        Diagram existing = makeDiagram(1L, "d1", "Diagram 1");
        when(diagramRepository.findById(1L)).thenReturn(Optional.of(existing));

        diagramService.deleteDiagram(1L);

        verify(diagramRepository).delete(existing);
    }

    @Test
    void deleteDiagram_notFound_throws404() {
        when(diagramRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> diagramService.deleteDiagram(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void getProcessedConfig_delegatesToConfigurationProcessor() {
        Diagram d = makeDiagram(1L, "test", "Test");
        d.setConfig("{\"url\":\"${HOST:localhost}\"}");
        when(configurationProcessor.processVariableSubstitution(d.getConfig()))
                .thenReturn("{\"url\":\"localhost\"}");

        assertThat(diagramService.getProcessedConfig(d)).isEqualTo("{\"url\":\"localhost\"}");
    }

    // --- Import Tests ---

    @Test
    void importFromDirectory_importsNewJsonFiles(@TempDir Path tempDir) throws Exception {
        Files.writeString(tempDir.resolve("test-diagram.json"),
                "{\"config\":{\"title\":\"Test Diagram\"},\"nodes\":[]}");
        Files.writeString(tempDir.resolve("another.json"),
                "{\"config\":{\"title\":\"Another Diagram\"},\"nodes\":[]}");
        Files.writeString(tempDir.resolve("readme.txt"), "should be ignored");

        when(diagramRepository.findByName(anyString())).thenReturn(Optional.empty());
        when(diagramRepository.save(any(Diagram.class))).thenAnswer(inv -> inv.getArgument(0));

        diagramService.importFromDirectory(tempDir);

        ArgumentCaptor<Diagram> captor = ArgumentCaptor.forClass(Diagram.class);
        verify(diagramRepository, times(2)).save(captor.capture());

        List<Diagram> saved = captor.getAllValues();
        assertThat(saved).extracting(Diagram::getName)
                .containsExactlyInAnyOrder("test-diagram", "another");
    }

    @Test
    void importFromDirectory_extractsTitleFromConfig(@TempDir Path tempDir) throws Exception {
        Files.writeString(tempDir.resolve("my-app.json"),
                "{\"config\":{\"title\":\"My Application\"},\"nodes\":[]}");

        when(diagramRepository.findByName("my-app")).thenReturn(Optional.empty());
        when(diagramRepository.save(any(Diagram.class))).thenAnswer(inv -> inv.getArgument(0));

        diagramService.importFromDirectory(tempDir);

        ArgumentCaptor<Diagram> captor = ArgumentCaptor.forClass(Diagram.class);
        verify(diagramRepository).save(captor.capture());
        assertThat(captor.getValue().getTitle()).isEqualTo("My Application");
    }

    @Test
    void importFromDirectory_skipsExistingDiagrams(@TempDir Path tempDir) throws Exception {
        Files.writeString(tempDir.resolve("existing.json"),
                "{\"config\":{\"title\":\"Existing\"},\"nodes\":[]}");

        when(diagramRepository.findByName("existing"))
                .thenReturn(Optional.of(makeDiagram(1L, "existing", "Existing")));

        diagramService.importFromDirectory(tempDir);

        verify(diagramRepository, never()).save(any());
    }

    @Test
    void importFromDirectory_isIdempotent(@TempDir Path tempDir) throws Exception {
        Files.writeString(tempDir.resolve("diagram.json"),
                "{\"config\":{\"title\":\"Diagram\"},\"nodes\":[]}");

        // First import: diagram doesn't exist yet
        when(diagramRepository.findByName("diagram")).thenReturn(Optional.empty());
        when(diagramRepository.save(any(Diagram.class))).thenAnswer(inv -> inv.getArgument(0));
        diagramService.importFromDirectory(tempDir);
        verify(diagramRepository, times(1)).save(any());

        // Second import: diagram now exists
        reset(diagramRepository);
        when(diagramRepository.findByName("diagram"))
                .thenReturn(Optional.of(makeDiagram(1L, "diagram", "Diagram")));
        diagramService.importFromDirectory(tempDir);
        verify(diagramRepository, never()).save(any());
    }

    @Test
    void importFromDirectory_handlesNullDirectory() {
        diagramService.importFromDirectory(null);

        verifyNoInteractions(diagramRepository);
    }

    private Diagram makeDiagram(Long id, String name, String title) {
        Diagram d = new Diagram();
        d.setId(id);
        d.setName(name);
        d.setTitle(title);
        d.setConfig("{\"nodes\":[]}");
        return d;
    }
}
