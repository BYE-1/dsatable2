package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

@Entity
@Table(name = "combat_talents")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CombatTalent {

    public static final String BASE_TALENT_NAME = "Basis";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "combat_talent_seq")
    @SequenceGenerator(name = "combat_talent_seq", sequenceName = "combat_talent_seq", allocationSize = 50)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false)
    private int attack;

    @Column(nullable = false)
    private int parry;

    @Column(name = "character_id")
    private Long characterId;

    public CombatTalent() {
    }

    public CombatTalent(int attack, int parry, String name) {
        this.attack = attack;
        this.parry = parry;
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAttack() {
        return attack;
    }

    public void setAttack(int attack) {
        this.attack = attack;
    }

    public int getParry() {
        return parry;
    }

    public void setParry(int parry) {
        this.parry = parry;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }
}


