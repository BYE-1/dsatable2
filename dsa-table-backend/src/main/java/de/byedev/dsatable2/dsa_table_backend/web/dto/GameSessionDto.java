package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.repository.BattlemapRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.stream.Collectors;

public class GameSessionDto {
    private Long id;
    private String title;
    private String description;
    private UserDto gameMaster;
    private Set<UserDto> players;
    private OffsetDateTime createdAt;
    private BattlemapDto battlemap;

    public GameSessionDto() {
    }

    public GameSessionDto(GameSession session, UserRepository userRepository) {
        this(session, userRepository, null);
    }

    public GameSessionDto(GameSession session, UserRepository userRepository, BattlemapRepository battlemapRepository) {
        this.id = session.getId();
        this.title = session.getTitle();
        this.description = session.getDescription();
        if (session.getGameMasterId() != null) {
            userRepository.findById(session.getGameMasterId())
                    .map(UserDto::new)
                    .ifPresent(gm -> this.gameMaster = gm);
        }
        if (session.getPlayerIds() != null && !session.getPlayerIds().isEmpty()) {
            this.players = session.getPlayerIds().stream()
                    .map(userRepository::findById)
                    .filter(java.util.Optional::isPresent)
                    .map(java.util.Optional::get)
                    .map(UserDto::new)
                    .collect(Collectors.toSet());
        }
        this.createdAt = session.getCreatedAt();
        if (battlemapRepository != null) {
            battlemapRepository.findBySessionId(session.getId())
                    .map(BattlemapDto::new)
                    .ifPresent(bm -> this.battlemap = bm);
        }
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public UserDto getGameMaster() {
        return gameMaster;
    }

    public void setGameMaster(UserDto gameMaster) {
        this.gameMaster = gameMaster;
    }

    public Set<UserDto> getPlayers() {
        return players;
    }

    public void setPlayers(Set<UserDto> players) {
        this.players = players;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public BattlemapDto getBattlemap() {
        return battlemap;
    }

    public void setBattlemap(BattlemapDto battlemap) {
        this.battlemap = battlemap;
    }

}

