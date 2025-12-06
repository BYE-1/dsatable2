package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.AuthResponse;
import de.byedev.dsatable2.dsa_table_backend.web.dto.LoginRequest;
import de.byedev.dsatable2.dsa_table_backend.web.dto.RegisterRequest;
import de.byedev.dsatable2.dsa_table_backend.web.dto.UserDto;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dsatable2/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    @Transactional
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // Check if username already exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Username already exists"));
        }

        // Create new user
        User user = new User(
                request.getUsername(),
                request.getDisplayName(),
                passwordEncoder.encode(request.getPassword())
        );
        User savedUser = userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getUsername());

        // Return response using DTO to avoid lazy loading issues
        return ResponseEntity.ok(new AuthResponse(token, savedUser));
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .map(user -> {
                    if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                        String token = jwtUtil.generateToken(user.getUsername());
                        // Use DTO to avoid lazy loading issues
                        return ResponseEntity.ok(new AuthResponse(token, user));
                    } else {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(Map.of("error", "Invalid credentials"));
                    }
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid credentials")));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDto> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            return userRepository.findByUsername(username)
                    .map(user -> ResponseEntity.ok(new UserDto(user)))
                    .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}

