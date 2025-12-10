package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.SavedMap;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public class SavedMapDto {
    private Long id;
    private String name;
    private String dataParam;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public SavedMapDto() {
    }

    public SavedMapDto(SavedMap savedMap) {
        this.id = savedMap.getId();
        this.name = savedMap.getName();
        this.dataParam = savedMap.getDataParam();
        this.createdAt = savedMap.getCreatedAt();
        this.updatedAt = savedMap.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDataParam() {
        return dataParam;
    }

    public void setDataParam(String dataParam) {
        this.dataParam = dataParam;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

