package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CharacterRepository extends JpaRepository<Character, Long> {

    List<Character> findByOwnerId(Long ownerId);

    List<Character> findBySessionId(Long sessionId);

    Optional<Character> findByName(String name);
}


