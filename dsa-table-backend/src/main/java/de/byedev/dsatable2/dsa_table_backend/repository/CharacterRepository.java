package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CharacterRepository extends JpaRepository<Character, Long> {

    List<Character> findByOwner(User owner);

    List<Character> findBySession(GameSession session);

    List<Character> findByOwner_Id(Long ownerId);

    List<Character> findBySession_Id(Long sessionId);

    Optional<Character> findByName(String name);
}


