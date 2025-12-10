package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.SavedMap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedMapRepository extends JpaRepository<SavedMap, Long> {
    
    List<SavedMap> findByUserIdOrderByUpdatedAtDesc(Long userId);
    
    Optional<SavedMap> findByIdAndUserId(Long id, Long userId);
}

