package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

@Entity
@Table(name = "talents")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Talent extends Ability {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "talent_seq")
    @SequenceGenerator(name = "talent_seq", sequenceName = "talent_seq", allocationSize = 50)
    private Long id;

    @Column(name = "character_id")
    private Long characterId;

    public Talent() {
        super();
    }

    public Talent(String name, String check, int value) {
        super(name, check, value);
    }

    public Long getId() {
        return id;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }
}


