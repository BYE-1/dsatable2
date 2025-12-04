package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Character> characters = new HashSet<>();

    @OneToMany(mappedBy = "gameMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private Set<GameSession> masteredSessions = new HashSet<>();

    @ManyToMany(mappedBy = "players")
    @JsonIgnore
    private Set<GameSession> joinedSessions = new HashSet<>();

    public User() {
    }

    public User(String username, String displayName) {
        this.username = username;
        this.displayName = displayName;
    }

    public User(String username, String displayName, String password) {
        this.username = username;
        this.displayName = displayName;
        this.password = password;
    }

    public Long getId() {
        return id;
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

    public Set<Character> getCharacters() {
        return characters;
    }

    public Set<GameSession> getMasteredSessions() {
        return masteredSessions;
    }

    public Set<GameSession> getJoinedSessions() {
        return joinedSessions;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}


