package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Transient;

import java.util.function.Function;

/**
 * Base class for DSA-like abilities (talents, spells, etc.).
 * <p>
 * This is modelled after the original Ability class but simplified for JPA.
 */
@MappedSuperclass
public abstract class Ability implements Rollable {

    @Enumerated(EnumType.STRING)
    @Column(name = "prop_one", length = 32)
    @JsonIgnore
    private PropertyName propOne;

    @Enumerated(EnumType.STRING)
    @Column(name = "prop_two", length = 32)
    @JsonIgnore
    private PropertyName propTwo;

    @Enumerated(EnumType.STRING)
    @Column(name = "prop_three", length = 32)
    @JsonIgnore
    private PropertyName propThree;

    @Column(name = "ability_name", nullable = false, length = 128)
    private String name;

    /**
     * Check string in the form "(MU/IN/GE)".
     */
    @Column(name = "check_expr", length = 32)
    private String check;

    @Column(name = "ability_value", nullable = false)
    private int value;

    @Column(length = 32)
    @JsonIgnore
    private String handicap;

    @Transient
    @JsonIgnore
    private Function<Integer, Integer> be;

    protected Ability() {
        // for JPA
    }

    protected Ability(String name, String check, int value) {
        this.name = name;
        this.check = check;
        String[] checks = parseCheckString(check);
        this.propOne = PropertyName.getByAbrv(checks[0]).orElse(PropertyName.NONE);
        this.propTwo = PropertyName.getByAbrv(checks[1]).orElse(PropertyName.NONE);
        this.propThree = PropertyName.getByAbrv(checks[2]).orElse(PropertyName.NONE);
        this.value = value;
    }

    @Override
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCheck() {
        return check;
    }

    public void setCheck(String check) {
        this.check = check;
        String[] checks = parseCheckString(check);
        this.propOne = PropertyName.getByAbrv(checks[0]).orElse(PropertyName.NONE);
        this.propTwo = PropertyName.getByAbrv(checks[1]).orElse(PropertyName.NONE);
        this.propThree = PropertyName.getByAbrv(checks[2]).orElse(PropertyName.NONE);
    }

    @Override
    public int getAbilityValue() {
        return getValue();
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public String getHandicap() {
        return handicap;
    }

    public void setHandicap(String handicap) {
        this.handicap = handicap;
        this.be = null; // reset cached function
    }

    @Override
    public PropertyName getProp(int n) {
        return switch (n) {
            case 0 -> propOne;
            case 1 -> propTwo;
            case 2 -> propThree;
            default -> null;
        };
    }

    /**
     * Effective BE modifier function, based on handicap.
     */
    public Function<Integer, Integer> getBe() {
        if (be == null) {
            if (handicap != null && !handicap.isEmpty()) {
                String lower = handicap.toLowerCase();
                if (lower.equals("be")) {
                    be = b -> b;
                } else if (lower.contains("x")) {
                    int mult = 2;
                    try {
                        mult = Integer.parseInt(handicap.split("x")[1]);
                    } catch (Exception ignored) {
                    }
                    int finalMult = mult;
                    be = b -> b * finalMult;
                } else if (lower.contains("-")) {
                    int sub = 2;
                    try {
                        sub = Integer.parseInt(handicap.split("-")[1]);
                    } catch (Exception ignored) {
                    }
                    int finalSub = sub;
                    be = b -> {
                        int eff = b - finalSub;
                        if (eff < 0) {
                            eff = 0;
                        }
                        return eff;
                    };
                } else {
                    be = b -> 0;
                }
            } else {
                be = b -> 0;
            }
        }
        return be;
    }

    public static String[] parseCheckString(String check) {
        if (check == null || check.isBlank()) {
            return new String[]{"--", "--", "--"};
        }
        String trimmed = check.trim();
        if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }
        String[] parts = trimmed.split("/");
        if (parts.length != 3) {
            return new String[]{"--", "--", "--"};
        }
        return parts;
    }

    @Override
    public Dice[] getDice() {
        // Three D20 rolls for classic DSA ability checks
        return new Dice[]{new Dice(20), new Dice(20), new Dice(20)};
    }

    @Override
    public String toString() {
        return name + check + " " + value;
    }
}


