package de.byedev.dsatable2.dsa_table_backend.model;

public interface Rollable {

    Dice[] getDice();

    PropertyName getProp(int n);

    String getName();

    int getAbilityValue();
}


