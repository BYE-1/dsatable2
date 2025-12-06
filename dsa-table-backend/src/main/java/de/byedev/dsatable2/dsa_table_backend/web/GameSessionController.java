package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.Battlemap;
import de.byedev.dsatable2.dsa_table_backend.model.BattlemapToken;
import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.BattlemapRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.CharacterRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.GameSessionRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapTokenDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.GameSessionDto;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
    private final BattlemapRepository battlemapRepository;
    private final JwtUtil jwtUtil;

    public GameSessionController(GameSessionRepository gameSessionRepository,
                                 UserRepository userRepository,
                                 CharacterRepository characterRepository,
                                 BattlemapRepository battlemapRepository,
                                 JwtUtil jwtUtil) {
        this.gameSessionRepository = gameSessionRepository;
        this.userRepository = userRepository;
        this.characterRepository = characterRepository;
        this.battlemapRepository = battlemapRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Cacheable(value = "gameSessions", key = "'list:' + (#gmId != null ? 'gm:' + #gmId : (#playerId != null ? 'player:' + #playerId : 'all'))")
    public List<GameSessionDto> getAll(
            @RequestParam(name = "gmId", required = false) Long gmId,
            @RequestParam(name = "playerId", required = false) Long playerId
    ) {
        List<GameSession> sessions;
        if (gmId != null) {
            sessions = gameSessionRepository.findByGameMasterId(gmId);
        } else if (playerId != null) {
            sessions = gameSessionRepository.findByPlayerId(playerId);
        } else {
            sessions = gameSessionRepository.findAll();
        }
        return sessions.stream()
                .map(session -> new GameSessionDto(session, userRepository, battlemapRepository))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Cacheable(value = "gameSessions", key = "#id")
    public ResponseEntity<GameSessionDto> getById(@PathVariable Long id) {
        return gameSessionRepository.findById(id)
                .map(session -> new GameSessionDto(session, userRepository, battlemapRepository))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    @CacheEvict(value = "gameSessions", allEntries = true)
    public ResponseEntity<GameSessionDto> create(@RequestBody GameSession session) {
        if (session.getId() != null) {
            return ResponseEntity.badRequest().build();
        }

        GameSession created = gameSessionRepository.save(session);
        return ResponseEntity
                .created(URI.create("/api/sessions/" + created.getId()))
                .body(new GameSessionDto(created, userRepository, battlemapRepository));
    }

    @PutMapping("/{id}")
    @Transactional
    @CacheEvict(value = "gameSessions", allEntries = true)
    public ResponseEntity<GameSessionDto> update(@PathVariable Long id, @RequestBody GameSession updated) {
        return gameSessionRepository.findById(id)
                .map(existing -> {
                    existing.setTitle(updated.getTitle());
                    existing.setDescription(updated.getDescription());
                    if (updated.getGameMasterId() != null) {
                        existing.setGameMasterId(updated.getGameMasterId());
                    }
                    if (updated.getPlayerIds() != null) {
                        existing.setPlayerIds(updated.getPlayerIds());
                    }
                    GameSession saved = gameSessionRepository.save(existing);
                    return ResponseEntity.ok(new GameSessionDto(saved, userRepository, battlemapRepository));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "gameSessions", allEntries = true)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!gameSessionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        gameSessionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/join")
    @Transactional
    @CacheEvict(value = "gameSessions", allEntries = true)
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

        Long userId = user.getId();

        GameSession session = gameSessionRepository.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user is the GM
        if (session.getGameMasterId() != null && session.getGameMasterId().equals(userId)) {
            return ResponseEntity.badRequest().build(); // GM doesn't need to join
        }

        Character character = characterRepository.findById(characterId).orElse(null);
        if (character == null) {
            return ResponseEntity.notFound().build();
        }

        // Verify character belongs to user
        if (character.getOwnerId() == null || !character.getOwnerId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        // Assign character to session
        character.setSessionId(session.getId());
        characterRepository.save(character);

        // Add user to players if not already there
        if (!session.getPlayerIds().contains(userId)) {
            session.getPlayerIds().add(userId);
            gameSessionRepository.save(session);
        }

        return ResponseEntity.ok(new GameSessionDto(session, userRepository, battlemapRepository));
    }

    @GetMapping("/{id}/battlemap")
    @Transactional(readOnly = true)
    @Cacheable(value = "battlemaps", key = "#id")
    public ResponseEntity<BattlemapDto> getBattlemap(@PathVariable Long id) {
        return battlemapRepository.findBySessionId(id)
                .map(BattlemapDto::new)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/battlemap")
    @Transactional
    @CacheEvict(value = {"battlemaps", "gameSessions"}, key = "#id")
    public ResponseEntity<BattlemapDto> updateBattlemap(@PathVariable Long id, @RequestBody BattlemapDto battlemapDto) {
        return gameSessionRepository.findById(id)
                .map(session -> {
                    Battlemap battlemap = battlemapRepository.findBySessionId(id)
                            .orElseGet(() -> {
                                Battlemap newBattlemap = new Battlemap(id);
                                return battlemapRepository.save(newBattlemap);
                            });

                    // Update battlemap properties
                    if (battlemapDto.getGridSize() != null) {
                        battlemap.setGridSize(battlemapDto.getGridSize());
                    }
                    if (battlemapDto.getCanvasWidth() != null) {
                        battlemap.setCanvasWidth(battlemapDto.getCanvasWidth());
                    }
                    if (battlemapDto.getCanvasHeight() != null) {
                        battlemap.setCanvasHeight(battlemapDto.getCanvasHeight());
                    }
                    if (battlemapDto.getMapImageUrl() != null) {
                        battlemap.setMapImageUrl(battlemapDto.getMapImageUrl());
                    }

                    // Update tokens
                    if (battlemapDto.getTokens() != null) {
                        // Clear existing tokens
                        battlemap.getTokens().clear();
                        
                        // Add new tokens
                        for (BattlemapTokenDto tokenDto : battlemapDto.getTokens()) {
                            BattlemapToken token = new BattlemapToken(
                                    battlemap,
                                    tokenDto.getTokenId(),
                                    tokenDto.getX(),
                                    tokenDto.getY(),
                                    tokenDto.getIsGmOnly()
                            );
                            battlemap.getTokens().add(token);
                        }
                    }

                    Battlemap saved = battlemapRepository.save(battlemap);
                    return ResponseEntity.ok(new BattlemapDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
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
        List<Character> characters = characterRepository.findByOwnerId(userId);
        Character myCharacter = characters.stream()
                .filter(c -> c.getSessionId() != null && c.getSessionId().equals(id))
                .findFirst()
                .orElse(null);

        if (myCharacter == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(myCharacter);
    }
}


