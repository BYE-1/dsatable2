package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {

    /**
     * Find sessions by game master ID.
     */
    List<GameSession> findByGameMasterId(Long gmId);

    /**
     * Find sessions where the given player ID is in the playerIds collection.
     */
    @Query("SELECT gs FROM GameSession gs WHERE :playerId MEMBER OF gs.playerIds")
    List<GameSession> findByPlayerId(@Param("playerId") Long playerId);
}


