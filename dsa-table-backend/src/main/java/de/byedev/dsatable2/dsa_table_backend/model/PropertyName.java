package de.byedev.dsatable2.dsa_table_backend.model;

import java.util.Arrays;
import java.util.Optional;

public enum PropertyName {

    COURAGE("Mut", "MU"),
    WISDOM("Klugheit", "KL"),
    INTUITION("Intuition", "IN"),
    CHARISMA("Charisma", "CH"),
    DEXTERITY("Fingerfertigkeit", "FF"),
    AGILITY("Gewandtheit", "GE"),
    CONSTITUTION("Konstitution", "KO"),
    STRENGTH("Körperkraft", "KK"),
    MAGIC_RESISTENZ("Magieresistenz", "MR"),
    LIFE("Lebensenergie", "LeP"),
    ENDURANCE("Ausdauer", "AuP"),
    MAGIC_ENERGY("Astralenergie", "ASP"),
    KARMA("Karmaenergie", "KE"),
    SOCIAL_STANDING("Sozialstatus", "SO"),
    BASE_ATTACK("AT", "AT"),
    BASE_DEFENCE("PA", "PA"),
    BASE_RANGED_AT("FK", "FK"),
    INITIATIVE("ini", "INI"),
    NONE("none", "--"),
    DODGE("Ausweichen", "Aw");

    private final String name;
    private final String abrv;

    PropertyName(String name, String abrv) {
        this.name = name;
        this.abrv = abrv;
    }

    public String getName() {
        return name;
    }

    public String getAbrv() {
        return abrv;
    }

    @Override
    public String toString() {
        return name;
    }

    public static Optional<PropertyName> getByName(String name) {
        return Arrays.stream(values())
                .filter(p -> p.getName().equalsIgnoreCase(name))
                .findAny();
    }

    public static Optional<PropertyName> getByAbrv(String abrv) {
        return Arrays.stream(values())
                .filter(p -> p.getAbrv().equalsIgnoreCase(abrv))
                .findAny();
    }
}



