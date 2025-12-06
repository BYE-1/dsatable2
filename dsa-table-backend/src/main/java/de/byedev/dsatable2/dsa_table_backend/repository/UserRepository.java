package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.User;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by username with caching.
     * Results are cached in the "usersByUsername" cache.
     * Empty Optionals are cached as null to avoid repeated database queries for non-existent users.
     */
    @Cacheable(value = "usersByUsername", key = "#username")
    Optional<User> findByUsername(String username);

    /**
     * Find user by ID with caching.
     * Results are cached in the "users" cache.
     * Empty Optionals are cached as null to avoid repeated database queries for non-existent users.
     */
    @Override
    @Cacheable(value = "users", key = "#id")
    Optional<User> findById(Long id);

    /**
     * Save user and evict related caches.
     * Evicts both the user cache and username cache to ensure consistency.
     */
    @Override
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    <S extends User> S save(S entity);

    /**
     * Delete user and evict related caches.
     */
    @Override
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    void deleteById(Long id);

    /**
     * Delete user and evict related caches.
     */
    @Override
    @CacheEvict(value = {"users", "usersByUsername", "userDtos"}, allEntries = true)
    void delete(User entity);
}


