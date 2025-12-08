package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.Battlemap;
import de.byedev.dsatable2.dsa_table_backend.model.BattlemapToken;
import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.FogRevealedArea;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.BattlemapRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.CharacterRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.GameSessionRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapTokenDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.FogRevealedAreaDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.GameSessionDto;
import org.hibernate.Hibernate;
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
        // Initialize playerIds collections before creating DTOs
        sessions.forEach(session -> Hibernate.initialize(session.getPlayerIds()));
        return sessions.stream()
                .map(session -> new GameSessionDto(session, userRepository, battlemapRepository))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Cacheable(value = "gameSessions", key = "#id")
    public ResponseEntity<GameSessionDto> getById(@PathVariable Long id) {
        return gameSessionRepository.findById(id)
                .map(session -> {
                    // Initialize playerIds collection before creating DTO
                    Hibernate.initialize(session.getPlayerIds());
                    return new GameSessionDto(session, userRepository, battlemapRepository);
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    @CacheEvict(value = "gameSessions", allEntries = true)
    public ResponseEntity<GameSessionDto> create(
            @RequestBody GameSession session,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (session.getId() != null) {
            return ResponseEntity.badRequest().build();
        }

        // Extract authenticated user and set as GM
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

        // Set the creator as the game master (ignore any gameMasterId from request)
        session.setGameMasterId(user.getId());
        // Ensure no players are set during creation
        session.setPlayerIds(new java.util.HashSet<>());

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
                    // Initialize playerIds collection before modifying
                    Hibernate.initialize(existing.getPlayerIds());
                    existing.setTitle(updated.getTitle());
                    existing.setDescription(updated.getDescription());
                    if (updated.getGameMasterId() != null) {
                        existing.setGameMasterId(updated.getGameMasterId());
                    }
                    if (updated.getPlayerIds() != null) {
                        existing.setPlayerIds(updated.getPlayerIds());
                    }
                    GameSession saved = gameSessionRepository.save(existing);
                    // Initialize collection in saved entity before creating DTO
                    Hibernate.initialize(saved.getPlayerIds());
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

        // Force initialization of playerIds collection
        Hibernate.initialize(session.getPlayerIds());

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

        // Check if user already has a character in this session
        List<Character> userCharacters = characterRepository.findByOwnerId(userId);
        Character existingCharacter = userCharacters.stream()
                .filter(c -> c.getSessionId() != null && c.getSessionId().equals(session.getId()))
                .findFirst()
                .orElse(null);

        if (existingCharacter != null) {
            // User already has a character in this session
            // If it's the same character, just ensure they're in the players list
            if (existingCharacter.getId().equals(characterId)) {
                // Character already assigned, just ensure user is in players list
                java.util.Set<Long> playerIds = session.getPlayerIds();
                if (!playerIds.contains(userId)) {
                    playerIds.add(userId);
                    gameSessionRepository.save(session);
                }
                return ResponseEntity.ok(new GameSessionDto(session, userRepository, battlemapRepository));
            } else {
                // User is trying to assign a different character
                // Reassign: remove sessionId from old character, assign to new one
                existingCharacter.setSessionId(null);
                characterRepository.save(existingCharacter);
            }
        }

        // Assign character to session
        character.setSessionId(session.getId());
        characterRepository.save(character);

        // Add user to players if not already there
        java.util.Set<Long> playerIds = session.getPlayerIds();
        if (!playerIds.contains(userId)) {
            playerIds.add(userId);
            gameSessionRepository.save(session);
        }

        return ResponseEntity.ok(new GameSessionDto(session, userRepository, battlemapRepository));
    }

    @GetMapping("/{id}/battlemap")
    @Transactional
    public ResponseEntity<BattlemapDto> getBattlemap(@PathVariable Long id) {
        // Verify session exists
        if (!gameSessionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // Get or create battlemap if it doesn't exist
        Battlemap battlemap = battlemapRepository.findBySessionId(id)
                .orElseGet(() -> {
                    Battlemap newBattlemap = new Battlemap(id);
                    return battlemapRepository.save(newBattlemap);
                });
        
        return ResponseEntity.ok(new BattlemapDto(battlemap));
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
                            token.setColor(tokenDto.getColor());
                            token.setAvatarUrl(tokenDto.getAvatarUrl());
                            token.setBorderColor(tokenDto.getBorderColor());
                            token.setName(tokenDto.getName());
                            battlemap.getTokens().add(token);
                        }
                    }

                    // Update fog revealed areas
                    if (battlemapDto.getFogRevealedAreas() != null) {
                        // Clear existing fog areas
                        battlemap.getFogRevealedAreas().clear();
                        
                        // Add new fog areas
                        for (FogRevealedAreaDto fogDto : battlemapDto.getFogRevealedAreas()) {
                            FogRevealedArea fogArea = new FogRevealedArea(
                                    fogDto.getGridX(),
                                    fogDto.getGridY()
                            );
                            battlemap.getFogRevealedAreas().add(fogArea);
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


