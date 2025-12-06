package de.byedev.dsatable2.dsa_table_backend.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "game_sessions")
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "game_session_seq")
    @SequenceGenerator(name = "game_session_seq", sequenceName = "game_session_seq", allocationSize = 50)
    private Long id;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(length = 1024)
    private String description;

    @Column(name = "gm_id")
    private Long gameMasterId;

    @ElementCollection
    @CollectionTable(
            name = "session_players",
            joinColumns = @JoinColumn(name = "session_id")
    )
    @Column(name = "user_id")
    private Set<Long> playerIds = new HashSet<>();

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public GameSession() {
    }

    public GameSession(String title, String description, Long gameMasterId) {
        this.title = title;
        this.description = description;
        this.gameMasterId = gameMasterId;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getGameMasterId() {
        return gameMasterId;
    }

    public void setGameMasterId(Long gameMasterId) {
        this.gameMasterId = gameMasterId;
    }

    public Set<Long> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(Set<Long> playerIds) {
        this.playerIds = playerIds;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}


