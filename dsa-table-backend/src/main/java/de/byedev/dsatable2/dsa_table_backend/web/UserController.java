package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.web.dto.UserDto;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<UserDto> getAll() {
        // Use DTOs to avoid lazy loading issues and reduce SELECT queries
        // Note: findAll() is not cached as it returns all users and may change frequently
        return userRepository.findAll().stream()
                .map(UserDto::new)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Cacheable(value = "userDtos", key = "#id")
    public ResponseEntity<UserDto> getById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(new UserDto(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    public ResponseEntity<UserDto> create(@RequestBody User user) {
        if (user.getId() != null) {
            return ResponseEntity.badRequest().build();
        }
        User created = userRepository.save(user);
        return ResponseEntity
                .created(URI.create("/api/users/" + created.getId()))
                .body(new UserDto(created));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    public ResponseEntity<UserDto> update(@PathVariable Long id, @RequestBody User updated) {
        return userRepository.findById(id)
                .map(existing -> {
                    existing.setUsername(updated.getUsername());
                    existing.setDisplayName(updated.getDisplayName());
                    User saved = userRepository.save(existing);
                    return ResponseEntity.ok(new UserDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}


