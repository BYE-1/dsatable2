package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

@Entity
@Table(name = "weapons")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Weapon {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "weapon_seq")
    @SequenceGenerator(name = "weapon_seq", sequenceName = "weapon_seq", allocationSize = 50)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    /**
     * Attack modifier (AT-Mod).
     */
    @Column(name = "at_mod")
    private int atMod;

    /**
     * Parry modifier (PA-Mod).
     */
    @Column(name = "pa_mod")
    private int paMod;

    /**
     * Number of damage dice (e.g. 1d6 -> 1, 2d6 -> 2).
     */
    @Column(name = "dice_count")
    private int numberOfDice;

    /**
     * Flat damage bonus added to the dice roll.
     */
    @Column(name = "damage_bonus")
    private int damageBonus;

    /**
     * Initiative modifier.
     */
    @Column(name = "ini_mod")
    private int iniMod;

    /**
     * Name of the associated combat talent (e.g. \"Swords\", \"Brawling\").
     */
    @Column(name = "combat_talent", length = 128)
    private String combatTalent;

    @Column(name = "character_id")
    private Long characterId;

    public Weapon() {
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

    public int getAtMod() {
        return atMod;
    }

    public void setAtMod(int atMod) {
        this.atMod = atMod;
    }

    public int getPaMod() {
        return paMod;
    }

    public void setPaMod(int paMod) {
        this.paMod = paMod;
    }

    public int getNumberOfDice() {
        return numberOfDice;
    }

    public void setNumberOfDice(int numberOfDice) {
        this.numberOfDice = numberOfDice;
    }

    public int getDamageBonus() {
        return damageBonus;
    }

    public void setDamageBonus(int damageBonus) {
        this.damageBonus = damageBonus;
    }

    public int getIniMod() {
        return iniMod;
    }

    public void setIniMod(int iniMod) {
        this.iniMod = iniMod;
    }

    public String getCombatTalent() {
        return combatTalent;
    }

    public void setCombatTalent(String combatTalent) {
        this.combatTalent = combatTalent;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }
}


