package de.byedev.dsatable2.dsa_table_backend.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.Arrays;

@Configuration
public class CacheConfig {

    /**
     * Configure cache manager for user caching.
     * Uses ConcurrentMapCacheManager for simple in-memory caching.
     * For production, consider using Caffeine or Redis cache.
     */
    @Bean
    @Primary
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(Arrays.asList(
                "users",           // Cache for User entities
                "usersByUsername", // Cache for User lookups by username
                "userDtos",        // Cache for UserDto objects
                "chatMessages",    // Cache for chat messages by session ID
                "characters",      // Cache for Character entities by ID
                "gameSessions",   // Cache for GameSession entities by ID
                "battlemaps"      // Cache for Battlemap entities by session ID
        ));
        // Allow null values to handle Optional.empty() cases gracefully
        cacheManager.setAllowNullValues(true);
        return cacheManager;
    }
}
