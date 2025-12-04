package de.byedev.dsatable2.dsa_table_backend.model;

import java.util.Random;

public class Dice {

    private static final Random RANDOM = new Random();

    private final int sides;

    public Dice(int sides) {
        if (sides <= 0) {
            throw new IllegalArgumentException("Dice must have at least one side");
        }
        this.sides = sides;
    }

    public int getSides() {
        return sides;
    }

    /**
     * Roll the dice once and return the result in [1, sides].
     * Helper method for server-side rolling if you need it.
     */
    public int roll() {
        return RANDOM.nextInt(sides) + 1;
    }
}


