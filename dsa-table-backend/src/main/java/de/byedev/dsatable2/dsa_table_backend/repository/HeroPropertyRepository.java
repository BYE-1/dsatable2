package de.byedev.dsatable2.dsa_table_backend.repository;

import de.byedev.dsatable2.dsa_table_backend.model.HeroProperty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HeroPropertyRepository extends JpaRepository<HeroProperty, Long> {

    List<HeroProperty> findByCharacterId(Long characterId);
}


