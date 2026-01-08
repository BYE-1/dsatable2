package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.HeroProperty;
import de.byedev.dsatable2.dsa_table_backend.model.PropertyName;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.CharacterRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.HeroPropertyRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.HeroXMLParser;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = "*")
@Tag(name = "Characters", description = "API for managing DSA characters (heroes)")
public class CharacterController {

    private static final Logger LOG = LoggerFactory.getLogger(CharacterController.class);

    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;
    private final HeroPropertyRepository heroPropertyRepository;
    private final JwtUtil jwtUtil;

    public CharacterController(CharacterRepository characterRepository,
                               UserRepository userRepository,
                               HeroPropertyRepository heroPropertyRepository,
                               JwtUtil jwtUtil) {
        this.characterRepository = characterRepository;
        this.userRepository = userRepository;
        this.heroPropertyRepository = heroPropertyRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Cacheable(value = "characters", key = "'list:' + (#ownerId != null ? 'owner:' + #ownerId : (#sessionId != null ? 'session:' + #sessionId : 'all'))")
    @Operation(summary = "Get all characters", description = "Retrieve all characters, optionally filtered by owner or session")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved characters")
    })
    public List<Character> getAll(
            @Parameter(description = "Filter by owner user ID") @RequestParam(name = "ownerId", required = false) Long ownerId,
            @Parameter(description = "Filter by game session ID") @RequestParam(name = "sessionId", required = false) Long sessionId
    ) {
        if (ownerId != null) {
            return characterRepository.findByOwnerId(ownerId);
        }
        if (sessionId != null) {
            return characterRepository.findBySessionId(sessionId);
        }
        return characterRepository.findAll();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Cacheable(value = "characters", key = "#id")
    @Operation(summary = "Get character by ID", description = "Retrieve a specific character by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Character found"),
            @ApiResponse(responseCode = "404", description = "Character not found")
    })
    public ResponseEntity<Character> getById(
            @Parameter(description = "Character ID") @PathVariable Long id) {
        return characterRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    @Operation(summary = "Create a new character", description = "Create a new DSA character")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Character created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid character data")
    })
    public ResponseEntity<Character> create(@RequestBody Character character) {
        if (character.getId() != null) {
            return ResponseEntity.badRequest().build();
        }

        // ownerId and sessionId are already set directly from the request body

        // Set default avatar URL if not provided
        if (character.getAvatarUrl() == null || character.getAvatarUrl().trim().isEmpty()) {
            character.setAvatarUrl("/api/char");
        }

        Character created = characterRepository.save(character);
        return ResponseEntity
                .created(URI.create("/api/characters/" + created.getId()))
                .body(created);
    }

    @PutMapping("/{id}")
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    public ResponseEntity<Character> update(@PathVariable Long id, @RequestBody Character updated) {
        return characterRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setArchetype(updated.getArchetype());
                    existing.setRace(updated.getRace());
                    existing.setCulture(updated.getCulture());
                    existing.setProfession(updated.getProfession());
                    existing.setGender(updated.getGender());
                    existing.setXp(updated.getXp());
                    existing.setCurrentLife(updated.getCurrentLife());
                    existing.setCurrentAsp(updated.getCurrentAsp());
                    existing.setCurrentKarma(updated.getCurrentKarma());
                    existing.setInitiative(updated.getInitiative());
                    existing.setArmourBe(updated.getArmourBe());
                    existing.setWounds(updated.getWounds());
                    existing.setNotes(updated.getNotes());
                    existing.setRawData(updated.getRawData());
                    // Set avatar URL, default to /api/char if not provided
                    if (updated.getAvatarUrl() != null && !updated.getAvatarUrl().trim().isEmpty()) {
                        existing.setAvatarUrl(updated.getAvatarUrl());
                    } else if (existing.getAvatarUrl() == null || existing.getAvatarUrl().trim().isEmpty()) {
                        existing.setAvatarUrl("/api/char");
                    }

                    // Update owner and session IDs directly
                    if (updated.getOwnerId() != null) {
                        existing.setOwnerId(updated.getOwnerId());
                    }
                    
                    if (updated.getSessionId() != null) {
                        existing.setSessionId(updated.getSessionId());
                    }

                    if (updated.getProperties() != null) {
                        existing.setProperties(updated.getProperties());
                    }

                    // Optionally update talents, spells, combat talents, advantages, specialities
                    if (updated.getTalents() != null) {
                        existing.setTalents(updated.getTalents());
                    }
                    if (updated.getSpells() != null) {
                        existing.setSpells(updated.getSpells());
                    }
                    if (updated.getCombatTalents() != null) {
                        existing.setCombatTalents(updated.getCombatTalents());
                    }
                    if (updated.getAdvantages() != null) {
                        existing.setAdvantages(updated.getAdvantages());
                    }
                    if (updated.getSpecialities() != null) {
                        existing.setSpecialities(updated.getSpecialities());
                    }
                    if (updated.getWeapons() != null) {
                        existing.setWeapons(updated.getWeapons());
                    }

                    Character saved = characterRepository.save(existing);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "characters", allEntries = true)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!characterRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        characterRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Property helpers ----

    @PutMapping("/{id}/properties")
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    public ResponseEntity<List<HeroProperty>> replaceProperties(@PathVariable Long id,
                                                                @RequestBody List<HeroProperty> properties) {
        return characterRepository.findById(id)
                .map(character -> {
                    character.setProperties(properties);
                    Character saved = characterRepository.save(character);
                    return ResponseEntity.ok(saved.getProperties());
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/properties/{propertyName}")
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    public ResponseEntity<HeroProperty> upsertSingleProperty(@PathVariable Long id,
                                                             @PathVariable PropertyName propertyName,
                                                             @RequestBody HeroProperty body) {
        return characterRepository.findById(id)
                .map(character -> {
                    // Find existing
                    HeroProperty existing = character.getProperties().stream()
                            .filter(p -> p.getNameEnum() == propertyName)
                            .findFirst()
                            .orElse(null);

                    if (existing == null) {
                        HeroProperty created = new HeroProperty(propertyName, body.getValue());
                        character.addProperty(created);
                        characterRepository.save(character);
                        return ResponseEntity.ok(created);
                    } else {
                        existing.setValue(body.getValue());
                        heroPropertyRepository.save(existing);
                        return ResponseEntity.ok(existing);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/upload-xml")
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    @Operation(summary = "Upload character from XML file", description = "Upload a DSA hero XML file to create a new character")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Character created successfully from XML"),
            @ApiResponse(responseCode = "400", description = "Invalid XML file or parsing error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<?> uploadFromXml(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sessionId", required = false) Long sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            String token = authHeader.substring(7);
            
            // Validate token first
            String username;
            try {
                username = jwtUtil.extractUsername(token);
                if (username == null) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Invalid token: username not found"));
                }
                
                // Validate token is not expired
                if (!jwtUtil.validateToken(token, username)) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Token expired or invalid"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid token: " + e.getMessage()));
            }
            
            User owner = userRepository.findByUsername(username).orElse(null);
            if (owner == null) {
                LOG.error("User not found for username: {}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found: " + username));
            }

            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File is empty"));
            }

            String xmlContent = new String(file.getBytes(), StandardCharsets.UTF_8);
            Character character = HeroXMLParser.fromXmlData(xmlContent);
            
            // Set owner ID
            character.setOwnerId(owner.getId());
            
            // Set session ID if provided
            if (sessionId != null) {
                character.setSessionId(sessionId);
            }
            
            // Initialize current resources based on calculated totals
            character.updateCalculated();
            character.setCurrentLife(character.getTotalLife());
            character.setCurrentAsp(character.getMagicEnergy());
            
            // Set default avatar URL if not provided
            if (character.getAvatarUrl() == null || character.getAvatarUrl().trim().isEmpty()) {
                character.setAvatarUrl("/api/char");
            }
            
            // Note: Bidirectional mappings are already handled by the setter methods
            // (setTalents, setSpells, etc. use addTalent, addSpell which set the character reference)
            // Batch inserts will be used automatically due to Hibernate batch configuration

            Character saved = characterRepository.save(character);
            return ResponseEntity
                    .created(URI.create("/api/characters/" + saved.getId()))
                    .body(saved);
                    
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Failed to parse XML: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/rest")
    @Transactional
    @CacheEvict(value = "characters", allEntries = true)
    @Operation(summary = "Perform rest for character", description = "Restore life and ASP based on character stats")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rest performed successfully"),
            @ApiResponse(responseCode = "404", description = "Character not found")
    })
    public ResponseEntity<Character> performRest(@PathVariable Long id) {
        return characterRepository.findById(id)
                .map(character -> {
                    // Calculate regeneration based on character stats
                    int lifeRegen = character.getLifeRegen();
                    int aspRegen = character.getAspRegen();
                    
                    // Apply regeneration (cap at max values)
                    int newLife = Math.min(
                        character.getCurrentLife() + lifeRegen,
                        character.getTotalLife()
                    );
                    int newAsp = Math.min(
                        character.getCurrentAsp() + aspRegen,
                        character.getMagicEnergy()
                    );
                    
                    character.setCurrentLife(newLife);
                    character.setCurrentAsp(newAsp);
                    
                    Character saved = characterRepository.save(character);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

}


