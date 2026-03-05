package com.example.diagramdesigner.repository;

import com.example.diagramdesigner.model.Diagram;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DiagramRepository extends JpaRepository<Diagram, Long> {

    Optional<Diagram> findByName(String name);
}
