package de.byedev.dsatable2.dsa_table_backend.web.dto;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.stream.Collectors;

public class GameSessionDto {
    private Long id;
    private String title;
    private String description;
    private UserDto gameMaster;
    private Set<UserDto> players;
    private Set<Character> characters;
    private OffsetDateTime createdAt;

    public GameSessionDto() {
    }

    public GameSessionDto(GameSession session) {
        this.id = session.getId();
        this.title = session.getTitle();
        this.description = session.getDescription();
        if (session.getGameMaster() != null) {
            this.gameMaster = new UserDto(session.getGameMaster());
        }
        if (session.getPlayers() != null) {
            this.players = session.getPlayers().stream()
                    .map(UserDto::new)
                    .collect(Collectors.toSet());
        }
        this.characters = session.getCharacters();
        this.createdAt = session.getCreatedAt();
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

    public Set<Character> getCharacters() {
        return characters;
    }

    public void setCharacters(Set<Character> characters) {
        this.characters = characters;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static class UserDto {
        private Long id;
        private String username;
        private String displayName;

        public UserDto() {
        }

        public UserDto(User user) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.displayName = user.getDisplayName();
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }
    }
}

