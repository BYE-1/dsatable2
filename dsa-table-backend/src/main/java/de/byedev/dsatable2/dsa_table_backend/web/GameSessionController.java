package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.CharacterRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.GameSessionRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.GameSessionDto;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
public class GameSessionController {

    private final GameSessionRepository gameSessionRepository;
    private final UserRepository userRepository;
    private final CharacterRepository characterRepository;
    private final JwtUtil jwtUtil;

    public GameSessionController(GameSessionRepository gameSessionRepository,
                                 UserRepository userRepository,
                                 CharacterRepository characterRepository,
                                 JwtUtil jwtUtil) {
        this.gameSessionRepository = gameSessionRepository;
        this.userRepository = userRepository;
        this.characterRepository = characterRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<GameSessionDto> getAll(
            @RequestParam(name = "gmId", required = false) Long gmId,
            @RequestParam(name = "playerId", required = false) Long playerId
    ) {
        List<GameSession> sessions;
        if (gmId != null) {
            sessions = gameSessionRepository.findByGameMaster_Id(gmId);
        } else if (playerId != null) {
            sessions = gameSessionRepository.findByPlayers_Id(playerId);
        } else {
            sessions = gameSessionRepository.findAll();
        }
        return sessions.stream()
                .map(GameSessionDto::new)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<GameSessionDto> getById(@PathVariable Long id) {
        return gameSessionRepository.findById(id)
                .map(GameSessionDto::new)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<GameSessionDto> create(@RequestBody GameSession session) {
        if (session.getId() != null) {
            return ResponseEntity.badRequest().build();
        }

        // Ensure GM exists if provided with id only
        User gm = session.getGameMaster();
        if (gm != null && gm.getId() != null) {
            gm = userRepository.findById(gm.getId()).orElse(null);
            session.setGameMaster(gm);
        }

        GameSession created = gameSessionRepository.save(session);
        return ResponseEntity
                .created(URI.create("/api/sessions/" + created.getId()))
                .body(new GameSessionDto(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GameSessionDto> update(@PathVariable Long id, @RequestBody GameSession updated) {
        return gameSessionRepository.findById(id)
                .map(existing -> {
                    existing.setTitle(updated.getTitle());
                    existing.setDescription(updated.getDescription());
                    if (updated.getGameMaster() != null && updated.getGameMaster().getId() != null) {
                        User gm = userRepository.findById(updated.getGameMaster().getId()).orElse(null);
                        existing.setGameMaster(gm);
                    }
                    GameSession saved = gameSessionRepository.save(existing);
                    return ResponseEntity.ok(new GameSessionDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!gameSessionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        gameSessionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/join")
    @Transactional
    public ResponseEntity<GameSessionDto> joinSession(
            @PathVariable Long id,
            @RequestParam Long characterId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        GameSession session = gameSessionRepository.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user is the GM
        if (session.getGameMaster() != null && session.getGameMaster().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().build(); // GM doesn't need to join
        }

        Character character = characterRepository.findById(characterId).orElse(null);
        if (character == null) {
            return ResponseEntity.notFound().build();
        }

        // Verify character belongs to user
        if (character.getOwner() == null || !character.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Assign character to session
        character.setSession(session);
        characterRepository.save(character);

        // Add user to players if not already there
        if (!session.getPlayers().contains(user)) {
            session.getPlayers().add(user);
            gameSessionRepository.save(session);
        }

        return ResponseEntity.ok(new GameSessionDto(session));
    }

    @GetMapping("/{id}/my-character")
    @Transactional(readOnly = true)
    public ResponseEntity<Character> getMyCharacter(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }

        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = user.getId();

        GameSession session = gameSessionRepository.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        // Find character owned by user and assigned to this session
        List<Character> characters = characterRepository.findByOwner_Id(userId);
        Character myCharacter = characters.stream()
                .filter(c -> c.getSession() != null && c.getSession().getId().equals(id))
                .findFirst()
                .orElse(null);

        if (myCharacter == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(myCharacter);
    }
}


