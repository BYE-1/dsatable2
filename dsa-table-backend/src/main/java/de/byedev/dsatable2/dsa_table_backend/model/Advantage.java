package de.byedev.dsatable2.dsa_table_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "advantages")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Advantage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 64)
    private String text = "";

    @ElementCollection
    @CollectionTable(name = "advantage_additional_texts", joinColumns = @JoinColumn(name = "advantage_id"))
    @Column(name = "additional_text", length = 255)
    private List<String> additionalText = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id")
    @JsonIgnore
    private Character character;

    public Advantage() {
    }

    public Advantage(String name, String text) {
        this.name = name;
        this.text = text;
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

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public int getTextAsInt() {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    public List<String> getAdditionalText() {
        if (additionalText == null) {
            additionalText = new ArrayList<>();
        }
        return additionalText;
    }

    public void setAdditionalText(List<String> additionalText) {
        this.additionalText = additionalText;
    }

    public Character getCharacter() {
        return character;
    }

    public void setCharacter(Character character) {
        this.character = character;
    }
}


