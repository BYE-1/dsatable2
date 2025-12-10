package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.SavedMap;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.SavedMapRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.SavedMapDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.SavedMapRequest;
import de.byedev.dsatable2.dsa_table_backend.web.exception.ResourceNotFoundException;
import de.byedev.dsatable2.dsa_table_backend.web.exception.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/saved-maps")
@CrossOrigin(origins = "*")
public class SavedMapController {

    private static final Logger logger = LoggerFactory.getLogger(SavedMapController.class);

    private final SavedMapRepository savedMapRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public SavedMapController(SavedMapRepository savedMapRepository,
                              UserRepository userRepository,
                              JwtUtil jwtUtil) {
        this.savedMapRepository = savedMapRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    private Long getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing or invalid authorization header");
        }
        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return user.getId();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<SavedMapDto>> getAllMaps(@RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        List<SavedMap> maps = savedMapRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        List<SavedMapDto> dtos = maps.stream()
                .map(SavedMapDto::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<SavedMapDto> getMapById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        SavedMap map = savedMapRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Map not found"));
        return ResponseEntity.ok(new SavedMapDto(map));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SavedMapDto> saveMap(
            @RequestBody SavedMapRequest request,
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        if (request.getDataParam() == null || request.getDataParam().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        SavedMap savedMap = new SavedMap(userId, request.getName().trim(), request.getDataParam());
        SavedMap saved = savedMapRepository.save(savedMap);
        logger.info("Saved map '{}' for user {}", saved.getName(), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(new SavedMapDto(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<SavedMapDto> updateMap(
            @PathVariable Long id,
            @RequestBody SavedMapRequest request,
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        
        SavedMap map = savedMapRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Map not found"));
        
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            map.setName(request.getName().trim());
        }
        
        if (request.getDataParam() != null && !request.getDataParam().trim().isEmpty()) {
            map.setDataParam(request.getDataParam());
        }
        
        SavedMap updated = savedMapRepository.save(map);
        logger.info("Updated map '{}' for user {}", updated.getName(), userId);
        return ResponseEntity.ok(new SavedMapDto(updated));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteMap(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        
        SavedMap map = savedMapRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Map not found"));
        
        savedMapRepository.delete(map);
        logger.info("Deleted map '{}' for user {}", map.getName(), userId);
        return ResponseEntity.noContent().build();
    }
}

