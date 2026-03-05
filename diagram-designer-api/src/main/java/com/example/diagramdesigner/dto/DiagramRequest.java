package com.example.diagramdesigner.dto;

import jakarta.validation.constraints.NotBlank;

public class DiagramRequest {

    @NotBlank
    private String name;

    private String title;

    @NotBlank
    private String config;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getConfig() {
        return config;
    }

    public void setConfig(String config) {
        this.config = config;
    }
}
