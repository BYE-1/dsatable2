package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import de.byedev.dsatable2.dsa_table_backend.util.HeroXMLParser;
import jakarta.persistence.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

import static de.byedev.dsatable2.dsa_table_backend.model.PropertyName.*;

@Entity
@Table(name = "characters")
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "id", "name", "race", "culture", "profession", "gender", "archetype",
    "xp", "currentLife", "currentAsp", "currentKarma", "initiative",
    "armourBe", "wearingArmour", "wounds", "notes", "avatarUrl",
    "properties", "talents", "spells", "combatTalents", "advantages", "specialities"
})
public class Character {

    private static final Logger LOG = LoggerFactory.getLogger(Character.class);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 64)
    private String archetype;

    @Column(length = 64)
    private String race;

    @Column(length = 128)
    private String culture;

    @Column(length = 64)
    private String profession;

    @Column(length = 16)
    private String gender;

    /**
     * Adventure points / experience.
     */
    private int xp;

    /**
     * Current resource values (for combat / play tracking).
     */
    private int currentLife;

    private int currentAsp;

    private int currentKarma;

    private int initiative;

    private int armourBe;

    private boolean wearingArmour;

    private int wounds;

    @Lob
    private String notes;

    /**
     * URL to the character avatar (SVG image).
     * If null, a default avatar URL will be generated.
     */
    @Column(length = 512)
    private String avatarUrl;

    /**
     * Optional raw hero data (e.g. imported XML from external tools).
     */
    @Lob
    @JsonIgnore
    private String rawData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    @JsonIgnore
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @JsonIgnore
    private GameSession session;

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HeroProperty> properties = new ArrayList<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Talent> talents = new ArrayList<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Spell> spells = new ArrayList<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CombatTalent> combatTalents = new ArrayList<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Advantage> advantages = new ArrayList<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Speciality> specialities = new ArrayList<>();

    public Character() {
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

    public String getArchetype() {
        return archetype;
    }

    public void setArchetype(String archetype) {
        this.archetype = archetype;
    }

    public String getRace() {
        return race;
    }

    public void setRace(String race) {
        this.race = race;
    }

    public String getCulture() {
        return culture;
    }

    public void setCulture(String culture) {
        this.culture = culture;
    }

    public String getProfession() {
        return profession;
    }

    public void setProfession(String profession) {
        this.profession = profession;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public int getXp() {
        return xp;
    }

    public void setXp(int xp) {
        this.xp = xp;
    }

    public int getCurrentLife() {
        return currentLife;
    }

    public void setCurrentLife(int currentLife) {
        this.currentLife = currentLife;
    }

    public int getCurrentAsp() {
        return currentAsp;
    }

    public void setCurrentAsp(int currentAsp) {
        this.currentAsp = currentAsp;
    }

    public int getCurrentKarma() {
        return currentKarma;
    }

    public void setCurrentKarma(int currentKarma) {
        this.currentKarma = currentKarma;
    }

    public int getInitiative() {
        return initiative;
    }

    public void setInitiative(int initiative) {
        this.initiative = initiative;
    }

    public int getArmourBe() {
        return armourBe;
    }

    public void setArmourBe(int armourBe) {
        this.armourBe = armourBe;
    }

    public boolean isWearingArmour() {
        return wearingArmour;
    }

    public void setWearingArmour(boolean wearingArmour) {
        this.wearingArmour = wearingArmour;
    }

    public int getWounds() {
        return wounds;
    }

    public void setWounds(int wounds) {
        this.wounds = wounds;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    /**
     * Gets the avatar URL, returning a default URL if none is set.
     * The default URL points to the character image endpoint with no parameters (default appearance).
     */
    public String getAvatarUrlOrDefault() {
        if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
            return avatarUrl;
        }
        // Return default avatar URL (no parameters = all defaults)
        return "/api/char";
    }

    public String getRawData() {
        return rawData;
    }

    public void setRawData(String rawData) {
        this.rawData = rawData;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public GameSession getSession() {
        return session;
    }

    public void setSession(GameSession session) {
        this.session = session;
    }

    public List<HeroProperty> getProperties() {
        return properties;
    }

    public void setProperties(List<HeroProperty> properties) {
        this.properties.clear();
        if (properties != null) {
            properties.forEach(this::addProperty);
        }
    }

    public void addProperty(HeroProperty property) {
        if (property == null) {
            return;
        }
        properties.add(property);
        property.setCharacter(this);
    }

    public void removeProperty(HeroProperty property) {
        if (property == null) {
            return;
        }
        properties.remove(property);
        property.setCharacter(null);
    }

    public List<Talent> getTalents() {
        return talents;
    }

    public void setTalents(List<Talent> talents) {
        this.talents.clear();
        if (talents != null) {
            talents.forEach(this::addTalent);
        }
    }

    public void addTalent(Talent talent) {
        if (talent == null) {
            return;
        }
        talents.add(talent);
        talent.setCharacter(this);
    }

    public void removeTalent(Talent talent) {
        if (talent == null) {
            return;
        }
        talents.remove(talent);
        talent.setCharacter(null);
    }

    public List<Spell> getSpells() {
        return spells;
    }

    public void setSpells(List<Spell> spells) {
        this.spells.clear();
        if (spells != null) {
            spells.forEach(this::addSpell);
        }
    }

    public void addSpell(Spell spell) {
        if (spell == null) {
            return;
        }
        spells.add(spell);
        spell.setCharacter(this);
    }

    public void removeSpell(Spell spell) {
        if (spell == null) {
            return;
        }
        spells.remove(spell);
        spell.setCharacter(null);
    }

    public List<CombatTalent> getCombatTalents() {
        return combatTalents;
    }

    public void setCombatTalents(List<CombatTalent> combatTalents) {
        this.combatTalents.clear();
        if (combatTalents != null) {
            combatTalents.forEach(this::addCombatTalent);
        }
    }

    public void addCombatTalent(CombatTalent combatTalent) {
        if (combatTalent == null) {
            return;
        }
        combatTalents.add(combatTalent);
        combatTalent.setCharacter(this);
    }

    public void removeCombatTalent(CombatTalent combatTalent) {
        if (combatTalent == null) {
            return;
        }
        combatTalents.remove(combatTalent);
        combatTalent.setCharacter(null);
    }

    public List<Advantage> getAdvantages() {
        return advantages;
    }

    public void setAdvantages(List<Advantage> advantages) {
        this.advantages.clear();
        if (advantages != null) {
            advantages.forEach(this::addAdvantage);
        }
    }

    public void addAdvantage(Advantage advantage) {
        if (advantage == null) {
            return;
        }
        advantages.add(advantage);
        advantage.setCharacter(this);
    }

    public void removeAdvantage(Advantage advantage) {
        if (advantage == null) {
            return;
        }
        advantages.remove(advantage);
        advantage.setCharacter(null);
    }

    public List<Speciality> getSpecialities() {
        return specialities;
    }

    public void setSpecialities(List<Speciality> specialities) {
        this.specialities.clear();
        if (specialities != null) {
            specialities.forEach(this::addSpeciality);
        }
    }

    public void addSpeciality(Speciality speciality) {
        if (speciality == null) {
            return;
        }
        specialities.add(speciality);
        speciality.setCharacter(this);
    }

    public void removeSpeciality(Speciality speciality) {
        if (speciality == null) {
            return;
        }
        specialities.remove(speciality);
        speciality.setCharacter(null);
    }

    // ---- Derived values & utility methods (similar to legacy Hero) ----

    public Optional<HeroProperty> getProperty(PropertyName name) {
        return getProperties().stream()
                .filter(p -> p.getNameEnum() == name)
                .findAny();
    }

    public int getPropertyValue(PropertyName name) {
        return getProperty(name).orElse(HeroProperty.NONE).getValue();
    }

    @com.fasterxml.jackson.annotation.JsonGetter("totalLife")
    public int getTotalLife() {
        return getPropertyValue(LIFE)
                + Math.round((getPropertyValue(CONSTITUTION) * 2 + getPropertyValue(STRENGTH)) / 2.0f);
    }

    public int getMagicResistance() {
        return getPropertyValue(MAGIC_RESISTENZ)
                + Math.round((getPropertyValue(COURAGE)
                + getPropertyValue(WISDOM)
                + getPropertyValue(CONSTITUTION)) / 5.0f);
    }

    public int getMagicEnergy() {
        Optional<HeroProperty> me = getProperty(MAGIC_ENERGY);
        if (me.isEmpty() || me.get().getValue() == 0) {
            return 0;
        }

        int base = getPropertyValue(MAGIC_ENERGY);
        int bonus;
        if (specialities != null && specialities.contains(new Speciality("Gefäß der Sterne"))) {
            bonus = Math.round((getPropertyValue(COURAGE)
                    + getPropertyValue(INTUITION)
                    + 2 * getPropertyValue(CHARISMA)) / 2.0f);
        } else {
            bonus = Math.round((getPropertyValue(COURAGE)
                    + getPropertyValue(INTUITION)
                    + getPropertyValue(CHARISMA)) / 2.0f);
        }
        return base + bonus;
    }

    public PropertyName getPrimaryPropertyName() {
        if (race != null && race.toLowerCase().contains("elf")) {
            return INTUITION;
        }
        if (profession != null && profession.toLowerCase().contains("hex")) {
            return CHARISMA;
        }
        return WISDOM;
    }

    public int getEndurance() {
        return getPropertyValue(ENDURANCE)
                + Math.round((getPropertyValue(COURAGE)
                + getPropertyValue(CONSTITUTION)
                + getPropertyValue(AGILITY)) / 2.0f);
    }

    public boolean hasSpeciality(String name) {
        return specialities != null
                && specialities.stream().anyMatch(s -> s.getName().equals(name));
    }

    /**
     * Recompute derived properties such as DODGE and basic combat talents.
     */
    public void updateCalculated() {
        if (properties.stream().noneMatch(p -> p.getNameEnum() == DODGE)) {
            addProperty(new HeroProperty(DODGE, 0));
        }

        int bonus = 0;
        if (hasSpeciality("Ausweichen I")) {
            bonus += 3;
        }
        if (hasSpeciality("Ausweichen II")) {
            bonus += 3;
        }
        if (hasSpeciality("Ausweichen III")) {
            bonus += 3;
        }
        Talent ath = talents.stream()
                .filter(t -> t.getName().equalsIgnoreCase("Athletik"))
                .findAny()
                .orElse(null);
        if (ath != null && ath.getValue() > 9) {
            bonus += (ath.getValue() - 9) / 3;
        }
        final int dodgeBonus = bonus;
        getProperty(DODGE).ifPresent(p -> p.setValue(getPropertyValue(BASE_DEFENCE) + dodgeBonus));

        if (combatTalents.stream()
                .noneMatch(ct -> CombatTalent.BASE_TALENT_NAME.equals(ct.getName()))) {
            addCombatTalent(new CombatTalent(getAT(), getPA(), CombatTalent.BASE_TALENT_NAME));
        }

        talents.stream()
                .filter(t -> t.getName().equalsIgnoreCase("bogen"))
                .findAny()
                .ifPresent(bogen -> addCombatTalent(
                        new CombatTalent(getPropertyValue(BASE_RANGED_AT) + bogen.getValue(), getPA(), "Bogen")));

        talents.stream()
                .filter(t -> t.getName().equalsIgnoreCase("armbrust"))
                .findAny()
                .ifPresent(armbrust -> addCombatTalent(
                        new CombatTalent(getPropertyValue(BASE_RANGED_AT) + armbrust.getValue(), getPA(), "Armbrust")));

        talents.stream()
                .filter(t -> t.getName().equalsIgnoreCase("wurfmesser"))
                .findAny()
                .ifPresent(wurf -> addCombatTalent(
                        new CombatTalent(getPropertyValue(BASE_RANGED_AT) + wurf.getValue(), getPA(), "Wurfmesser")));
    }

    public int getAT() {
        return getPropertyValue(BASE_ATTACK);
    }

    public int getPA() {
        return getPropertyValue(BASE_DEFENCE);
    }

    public int getLifeRegen() {
        Random random = new Random();
        int reg = random.nextInt(6) + 1;

        Optional<Advantage> adv = advantages.stream()
                .filter(a -> a.getName().equals("Schnelle Heilung"))
                .findAny();
        int baseReg = reg;
        if (adv.isPresent()) {
            baseReg += adv.get().getTextAsInt();
        }
        Optional<Advantage> dis = advantages.stream()
                .filter(a -> a.getName().equals("Schlechte Regeneration"))
                .findAny();
        if (dis.isPresent()) {
            baseReg += dis.get().getTextAsInt();
        }

        if (random.nextInt(20) + 1 <= getPropertyValue(CONSTITUTION)) {
            baseReg++;
        }
        return baseReg;
    }

    public int getAspRegen() {
        if (getMagicEnergy() == 0) {
            return 0;
        }
        Random random = new Random();
        int regBase = random.nextInt(6) + 1;

        if (hasSpeciality("Meisterliche Regeneration")) {
            regBase = Math.round(getPropertyValue(getPrimaryPropertyName()) / 3.0f) + 1;
        }

        Optional<Advantage> adv = advantages.stream()
                .filter(a -> a.getName().equals("Astrale Regeneration"))
                .findAny();
        if (adv.isPresent()) {
            regBase += adv.get().getTextAsInt();
        }

        if (hasSpeciality("Regeneration I")) {
            regBase++;
        }
        if (hasSpeciality("Regeneration II")) {
            regBase++;
        }

        if (random.nextInt(20) + 1 <= getPropertyValue(INTUITION)) {
            regBase++;
        }
        return regBase;
    }

    /**
     * Re-parse {@link #rawData} XML and update this character in-place.
     */
    public void reparse() {
        if (rawData == null) {
            return;
        }
        try {
            Character parsed = HeroXMLParser.fromXmlData(getRawData());
            updateFrom(parsed);
        } catch (Exception e) {
            LOG.warn("Error while reparsing the hero: {}", e.getMessage());
        }
    }

    /**
     * Copy over most state from another character (used by reparse).
     */
    public void updateFrom(Character other) {
        this.rawData = other.rawData;
        this.name = other.name;
        this.race = other.race;
        this.profession = other.profession;
        this.culture = other.culture;
        this.gender = other.gender;
        this.xp = other.xp;

        setProperties(other.getProperties());
        setTalents(other.getTalents());
        setSpells(other.getSpells());
        setCombatTalents(other.getCombatTalents());
        setAdvantages(other.getAdvantages());
        setSpecialities(other.getSpecialities());

        updateCalculated();
    }
}


