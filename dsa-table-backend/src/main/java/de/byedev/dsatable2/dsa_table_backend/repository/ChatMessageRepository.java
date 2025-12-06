package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    /**
     * Find all messages for a session, eagerly loading author and session to avoid N+1 queries.
     * Uses JOIN FETCH to load relationships in a single query.
     */
    @Query("SELECT DISTINCT cm FROM ChatMessage cm " +
           "LEFT JOIN FETCH cm.author " +
           "LEFT JOIN FETCH cm.session " +
           "WHERE cm.session.id = :sessionId " +
           "ORDER BY cm.createdAt ASC")
    List<ChatMessage> findBySession_IdOrderByCreatedAtAsc(@Param("sessionId") Long sessionId);
    
    /**
     * Find recent messages for a session, eagerly loading author and session to avoid N+1 queries.
     * Uses JOIN FETCH to load relationships in a single query.
     */
    @Query("SELECT DISTINCT cm FROM ChatMessage cm " +
           "LEFT JOIN FETCH cm.author " +
           "LEFT JOIN FETCH cm.session " +
           "WHERE cm.session.id = :sessionId " +
           "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findRecentMessages(@Param("sessionId") Long sessionId);
    
    /**
     * Find a message by ID, eagerly loading author and session to avoid lazy loading issues.
     * Uses JOIN FETCH to load relationships in a single query.
     */
    @Query("SELECT DISTINCT cm FROM ChatMessage cm " +
           "LEFT JOIN FETCH cm.author " +
           "LEFT JOIN FETCH cm.session " +
           "WHERE cm.id = :id")
    Optional<ChatMessage> findByIdWithRelations(@Param("id") Long id);
}

