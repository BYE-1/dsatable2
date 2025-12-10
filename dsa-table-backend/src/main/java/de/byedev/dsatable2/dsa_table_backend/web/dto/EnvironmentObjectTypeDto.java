package de.byedev.dsatable2.dsa_table_backend.web.dto;

public class EnvironmentObjectTypeDto {
    private String type;
    private String label;
    private String defaultColor;
    private Integer defaultSize;

    public EnvironmentObjectTypeDto() {
    }

    public EnvironmentObjectTypeDto(String type, String label, String defaultColor, Integer defaultSize) {
        this.type = type;
        this.label = label;
        this.defaultColor = defaultColor;
        this.defaultSize = defaultSize;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getDefaultColor() {
        return defaultColor;
    }

    public void setDefaultColor(String defaultColor) {
        this.defaultColor = defaultColor;
    }

    public Integer getDefaultSize() {
        return defaultSize;
    }

    public void setDefaultSize(Integer defaultSize) {
        this.defaultSize = defaultSize;
    }
}

