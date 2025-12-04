package de.byedev.dsatable2.dsa_table_backend.util;

import de.byedev.dsatable2.dsa_table_backend.model.Advantage;
import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.CombatTalent;
import de.byedev.dsatable2.dsa_table_backend.model.HeroProperty;
import de.byedev.dsatable2.dsa_table_backend.model.PropertyName;
import de.byedev.dsatable2.dsa_table_backend.model.Speciality;
import de.byedev.dsatable2.dsa_table_backend.model.Spell;
import de.byedev.dsatable2.dsa_table_backend.model.Talent;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Parser for DSA hero XML (e.g. from Heldenbogen tools) into our {@link Character} model.
 */
public class HeroXMLParser {

    public static Character fromXmlData(String rawData)
            throws ParserConfigurationException, IOException, SAXException {

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(rawData.getBytes()));
        doc.getDocumentElement().normalize();

        Node heroRoot = doc.getDocumentElement().getElementsByTagName("held").item(0);
        if (heroRoot == null || heroRoot.getNodeType() != Node.ELEMENT_NODE) {
            throw new IllegalArgumentException("No <held> element found in hero XML");
        }
        Element hero = (Element) heroRoot;

        String name = hero.getAttribute("name");

        Element basis = null;
        Element property = null;
        Element talent = null;
        Element spell = null;
        Element combat = null;
        Element vt = null;
        Element sf = null;

        NodeList heroNodes = hero.getChildNodes();
        for (int i = 0; i < heroNodes.getLength(); i++) {
            Node n = heroNodes.item(i);
            if (n.getNodeType() != Node.ELEMENT_NODE) {
                continue;
            }
            switch (n.getNodeName()) {
                case "basis" -> basis = (Element) n;
                case "eigenschaften" -> property = (Element) n;
                case "talentliste" -> talent = (Element) n;
                case "zauberliste" -> spell = (Element) n;
                case "kampf" -> combat = (Element) n;
                case "vt" -> vt = (Element) n;
                case "sf" -> sf = (Element) n;
            }
        }

        Character character = new Character();
        character.setRawData(rawData);
        character.setName(name);

        if (basis != null) {
            character.setCulture(((Element) basis.getElementsByTagName("kultur").item(0)).getAttribute("string"));
            character.setRace(((Element) basis.getElementsByTagName("rasse").item(0)).getAttribute("string"));
            character.setGender(((Element) basis.getElementsByTagName("geschlecht").item(0)).getAttribute("name"));

            String ap = ((Element) basis.getElementsByTagName("abenteuerpunkte").item(0)).getAttribute("value");
            try {
                character.setXp(Integer.parseInt(ap));
            } catch (NumberFormatException ignored) {
            }

            NodeList professions = basis.getElementsByTagName("ausbildungen").item(0).getChildNodes();
            for (int i = 0; i < professions.getLength(); i++) {
                Node n = professions.item(i);
                if (n instanceof Element) {
                    character.setProfession(((Element) n).getAttribute("string"));
                }
            }
        }

        // Properties
        if (property != null) {
            NodeList propNodes = property.getChildNodes();
            List<HeroProperty> properties = new ArrayList<>();
            for (int i = 0; i < propNodes.getLength(); i++) {
                Node n = propNodes.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("eigenschaft")) {
                    Element prop = (Element) n;
                    Optional<PropertyName> propName = PropertyName.getByName(prop.getAttribute("name"));
                    if (propName.isPresent()) {
                        int value = parseIntSafe(prop.getAttribute("value"));
                        int mod = parseIntSafe(prop.getAttribute("mod"));
                        HeroProperty heroProperty = new HeroProperty(propName.get(), value + mod);
                        properties.add(heroProperty);
                    }
                }
            }
            character.setProperties(properties);
        }

        // Talents
        if (talent != null) {
            NodeList talentList = talent.getChildNodes();
            List<Talent> talents = new ArrayList<>();
            for (int i = 0; i < talentList.getLength(); i++) {
                Node n = talentList.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("talent")) {
                    Element prop = (Element) n;
                    Talent talentV = new Talent(
                            prop.getAttribute("name"),
                            prop.getAttribute("probe"),
                            parseIntSafe(prop.getAttribute("value"))
                    );
                    talentV.setHandicap(getCombatTalentBe(prop.getAttribute("name"), prop.getAttribute("be")));
                    talents.add(talentV);
                }
            }
            character.setTalents(talents);
        }

        // Spells
        if (spell != null) {
            NodeList spellList = spell.getChildNodes();
            List<Spell> spells = new ArrayList<>();
            for (int i = 0; i < spellList.getLength(); i++) {
                Node n = spellList.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("zauber")) {
                    Element prop = (Element) n;
                    spells.add(new Spell(
                            prop.getAttribute("name"),
                            prop.getAttribute("probe"),
                            parseIntSafe(prop.getAttribute("value"))
                    ));
                }
            }
            character.setSpells(spells);
        }

        // Combat talents
        if (combat != null) {
            NodeList combatTalentList = combat.getChildNodes();
            List<CombatTalent> combats = new ArrayList<>();
            for (int i = 0; i < combatTalentList.getLength(); i++) {
                Node n = combatTalentList.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("kampfwerte")) {
                    Element prop = (Element) n;
                    int at = parseIntSafe(((Element) prop.getChildNodes().item(0)).getAttribute("value"));
                    int pa = parseIntSafe(((Element) prop.getChildNodes().item(1)).getAttribute("value"));
                    combats.add(new CombatTalent(at, pa, prop.getAttribute("name")));
                }
            }
            character.setCombatTalents(combats);
        }

        // Advantages
        if (vt != null) {
            NodeList advantageList = vt.getChildNodes();
            List<Advantage> advantages = new ArrayList<>();
            for (int i = 0; i < advantageList.getLength(); i++) {
                Node n = advantageList.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("vorteil")) {
                    Element prop = (Element) n;
                    Advantage advantage = new Advantage(
                            prop.getAttribute("name"),
                            prop.getAttribute("value")
                    );
                    NodeList childNodes = prop.getChildNodes();
                    for (int j = 0; j < childNodes.getLength(); j++) {
                        if (Element.class.isAssignableFrom(childNodes.item(j).getClass())) {
                            Element child = (Element) childNodes.item(j);
                            advantage.getAdditionalText().add(child.getAttribute("value"));
                        }
                    }
                    advantages.add(advantage);
                }
            }
            character.setAdvantages(advantages);
        }

        // Specialities
        if (sf != null) {
            NodeList specialityList = sf.getChildNodes();
            List<Speciality> specialities = new ArrayList<>();
            for (int i = 0; i < specialityList.getLength(); i++) {
                Node n = specialityList.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("sonderfertigkeit")) {
                    Element prop = (Element) n;
                    String vtname = prop.getAttribute("name");
                    specialities.add(new Speciality(vtname));
                }
            }
            character.setSpecialities(specialities);
        }

        return character;
    }

    private static int parseIntSafe(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    public static String getCombatTalentBe(String name, String def) {
        return switch (name) {
            case "Anderthalbhänder" -> "BE-2";
            case "Armbrust" -> "BE-5";
            case "Belagerungswaffen" -> "";
            case "Blasrohr" -> "BE-5";
            case "Bogen" -> "BE-5";
            case "Diskus" -> "BE-2";
            case "Dolche" -> "BE-1";
            case "Fechtwaffen" -> "BE-1";
            case "Hiebwaffen" -> "BE-4";
            case "Infanteriewaffen" -> "BE-3";
            case "Kettenstäbe" -> "BE-1";
            case "Kettenwaffen" -> "BE-3";
            case "Lanzenreiten" -> "";
            case "Peitsche" -> "BE-1";
            case "Raufen" -> "BE";
            case "Ringen" -> "BE";
            case "Säbel" -> "BE-2";
            case "Schleuder" -> "BE-2";
            case "Schwerter" -> "BE-2";
            case "Speere" -> "BE-3";
            case "Stäbe" -> "BE-2";
            case "Wurfbeile" -> "BE-2";
            case "Wurfmesser" -> "BE-3";
            case "Wurfspeere" -> "BE-2";
            case "Zweihandflegel" -> "BE-3";
            case "Zweihand-Hiebwaffen" -> "BE-3";
            case "Zweihandschwerter/-säbel" -> "BE-2";
            default -> def;
        };
    }
}


