package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.Battlemap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BattlemapRepository extends JpaRepository<Battlemap, Long> {
    Optional<Battlemap> findBySessionId(Long sessionId);
}
