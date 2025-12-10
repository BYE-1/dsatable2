package de.byedev.dsatable2.dsa_table_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_maps")
public class SavedMap {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "saved_map_seq")
    @SequenceGenerator(name = "saved_map_seq", sequenceName = "saved_map_seq", allocationSize = 50)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "data_param", nullable = false, columnDefinition = "TEXT")
    private String dataParam;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SavedMap() {
    }

    public SavedMap(Long userId, String name, String dataParam) {
        this.userId = userId;
        this.name = name;
        this.dataParam = dataParam;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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

