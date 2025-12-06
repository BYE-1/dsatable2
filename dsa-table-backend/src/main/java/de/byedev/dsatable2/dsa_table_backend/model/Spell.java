package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

@Entity
@Table(name = "spells")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Spell extends Ability {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "spell_seq")
    @SequenceGenerator(name = "spell_seq", sequenceName = "spell_seq", allocationSize = 50)
    private Long id;

    @Column(name = "character_id")
    private Long characterId;

    public Spell() {
        super();
    }

    public Spell(String name, String check, int value) {
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


