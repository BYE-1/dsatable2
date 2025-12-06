package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "hero_properties")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HeroProperty {

    public static final transient HeroProperty NONE = new HeroProperty(PropertyName.NONE, 0);

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "hero_property_seq")
    @SequenceGenerator(name = "hero_property_seq", sequenceName = "hero_property_seq", allocationSize = 50)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    @JsonIgnore
    private PropertyName name;

    @Column(name = "prop_value", nullable = false)
    private int value;

    @Column(name = "character_id")
    private Long characterId;

    public HeroProperty() {
    }

    public HeroProperty(PropertyName name, int value) {
        this.name = name;
        this.value = value;
    }

    public Long getId() {
        return id;
    }

    @JsonIgnore
    public PropertyName getNameEnum() {
        return name;
    }

    @JsonProperty("name")
    public String getName() {
        return name != null ? name.getName() : null;
    }

    public void setName(PropertyName name) {
        this.name = name;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }

    @Override
    public String toString() {
        return name.getName() + " " + value;
    }
}


