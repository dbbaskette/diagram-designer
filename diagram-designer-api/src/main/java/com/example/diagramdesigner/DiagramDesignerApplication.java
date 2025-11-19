package com.example.diagramdesigner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DiagramDesignerApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiagramDesignerApplication.class, args);
    }
}