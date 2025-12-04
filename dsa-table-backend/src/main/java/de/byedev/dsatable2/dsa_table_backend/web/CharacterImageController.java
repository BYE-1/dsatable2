package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.util.SVGUtil;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.awt.*;
import java.util.Arrays;

@RestController
@RequestMapping("/api/char")
public class CharacterImageController {

    public static final String PARAM_HAIR = "hair";
    public static final String PARAM_SKIN = "skin";
    public static final String PARAM_CLOTH_COLOUR = "clothC";
    public static final String PARAM_HAIR_COLOUR = "hairColour";
    public static final String PARAM_MOUTH = "mouth";
    public static final String PARAM_EYEBROWS = "eyebrows";
    public static final String PARAM_WEAPON = "weapon";
    public static final String PARAM_EQUIP = "equip";
    public static final String PARAM_EARS = "ears";

    public static final String MOUTH_COVERED = "covered";
    public static final String MOUTH_DOWN = "down";
    public static final String MOUTH_STRAIGHT = "straight";
    public static final String MOUTH_UP = "up";
    public static final String[] MOUTH_OPTIONS = {MOUTH_UP, MOUTH_DOWN, MOUTH_STRAIGHT, MOUTH_COVERED};

    public static final String EYEBROWS_STRAIGHT = "straight";
    public static final String EYEBROWS_DOWN = "down";
    public static final String EYEBROWS_NONE = "none";
    public static final String[] EYEBROW_OPTIONS = {EYEBROWS_STRAIGHT, EYEBROWS_DOWN, EYEBROWS_NONE};

    public static final String HAIR_BALD = "bald";
    public static final String HAIR_TOMAHAWK = "tomahawk";
    public static final String HAIR_SHORT_RUFFLED = "short_ruffled";
    public static final String HAIR_SHORT_CURLY = "short_curly";
    public static final String HAIR_UNDERCUT = "undercut";
    public static final String HAIR_LONG = "long";
    public static final String[] HAIR_OPTIONS = {HAIR_LONG, HAIR_SHORT_RUFFLED, HAIR_SHORT_CURLY, HAIR_UNDERCUT, HAIR_TOMAHAWK, HAIR_BALD};

    public static final String EARS_NONE = "none";
    public static final String EARS_STD = "normal";
    public static final String EARS_POINTY = "pointy";
    public static final String[] EARS_OPTIONS = {EARS_NONE, EARS_STD, EARS_POINTY};

    public static final String WEAPON_NONE = "none";
    public static final String WEAPON_SWORD = "sword";
    public static final String WEAPON_AXE = "axe";
    public static final String WEAPON_BOW = "bow";
    public static final String[] WEAPON_OPTIONS = {WEAPON_NONE, WEAPON_SWORD, WEAPON_AXE, WEAPON_BOW};

    public static final String HAIR_COLOUR_DEFAULT = "#f3bf00";
    public static final String CLOTH_COLOUR_DEFAULT = "#00cc00";
    public static final String SKIN_COLOUR_DEFAULT = "#ffd9b5";

    public static final String EQUIP_SHOULDER_PADS = "shoulder_pads";
    public static final String EQUIP_HELMET = "helmet";

    @GetMapping(produces = "image/svg+xml")
    public ResponseEntity<String> generateCharacterImage(
            @RequestParam(value = PARAM_HAIR, required = false) String hair,
            @RequestParam(value = PARAM_SKIN, required = false) String skinC,
            @RequestParam(value = PARAM_CLOTH_COLOUR, required = false) String clothC,
            @RequestParam(value = PARAM_HAIR_COLOUR, required = false) String hairC,
            @RequestParam(value = PARAM_MOUTH, required = false) String mouth,
            @RequestParam(value = PARAM_EARS, required = false) String ears,
            @RequestParam(value = PARAM_EYEBROWS, required = false) String eyebrows,
            @RequestParam(value = PARAM_WEAPON, required = false) String weapon,
            @RequestParam(value = PARAM_EQUIP, required = false) String[] equip) {

        // Set defaults
        if (StringUtils.isEmpty(hair)) {
            hair = "";
        }
        if (skinC == null) {
            skinC = SKIN_COLOUR_DEFAULT;
        }
        if (clothC == null) {
            clothC = CLOTH_COLOUR_DEFAULT;
        }
        if (hairC == null) {
            hairC = HAIR_COLOUR_DEFAULT;
        }
        if (StringUtils.isEmpty(mouth)) {
            mouth = MOUTH_UP;
        }
        if (StringUtils.isEmpty(ears)) {
            ears = EARS_NONE;
        }
        if (StringUtils.isEmpty(eyebrows)) {
            eyebrows = EYEBROWS_NONE;
        }
        if (StringUtils.isEmpty(weapon)) {
            weapon = WEAPON_NONE;
        }
        if (equip == null) {
            equip = new String[0];
        }

        StringBuilder builder = new StringBuilder();

        builder.append(SVGUtil.SVG_OPEN);
        builder.append(addWeapon(weapon));
        builder.append(addHairBack(hair, hairC));
        builder.append(addCloth(clothC));
        if (containsEquip(equip, EQUIP_SHOULDER_PADS)) {
            builder.append(SVGUtil.getSvg(SVGUtil.SHOULDER_PADS, Color.decode(clothC).darker().darker()));
        }
        if (containsEquip(equip, EQUIP_HELMET)) {
            builder.append(addHead(clothC));
            builder.append(SVGUtil.getSvg(SVGUtil.VISOR, Color.decode(clothC).darker().darker()));
            builder.append(SVGUtil.getSvg(SVGUtil.VISOR_OPENING, Color.decode(skinC)));
            builder.append(addEyes());
        } else {
            builder.append(addEars(ears, skinC));
            builder.append(addHead(skinC));
            builder.append(addMouth(mouth));
            builder.append(addEyes());
            builder.append(addEyebrows(eyebrows));
            builder.append(addHair(hair, hairC));
        }
        builder.append(addWeaponFront(weapon));
        builder.append(SVGUtil.SVG_CLOSE);

        String svgContent = SVGUtil.DOCTYPE + builder.toString();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("image/svg+xml"))
                .body(svgContent);
    }

    private String addEars(String ears, String skinC) {
        switch (ears) {
            case EARS_STD:
                return SVGUtil.getSvg(SVGUtil.EARS, skinC);
            case EARS_POINTY:
                return SVGUtil.getSvg(SVGUtil.EARS_POINTY, skinC);
            case EARS_NONE:
            default:
                return "";
        }
    }

    public String addHead(String skinC) {
        return SVGUtil.getSvg(SVGUtil.HEAD, skinC);
    }

    public String addMouth(String mouth) {
        switch (mouth) {
            case MOUTH_COVERED:
                return SVGUtil.getSvg(SVGUtil.MOUTH_COVERED, Color.BLACK);
            case MOUTH_DOWN:
                return SVGUtil.getSvg(SVGUtil.MOUTH_DOWN, Color.BLACK);
            case MOUTH_STRAIGHT:
                return SVGUtil.getSvg(SVGUtil.MOUTH_STRAIGHT, Color.BLACK);
            case MOUTH_UP:
            default:
                return SVGUtil.getSvg(SVGUtil.MOUTH_UP, Color.BLACK);
        }
    }

    public String addEyes() {
        return SVGUtil.getSvg(SVGUtil.EYES, Color.BLACK);
    }

    public String addEyebrows(String eyebrows) {
        switch (eyebrows) {
            case EYEBROWS_DOWN:
                return SVGUtil.getSvg(SVGUtil.EYEBROWS_DOWN, Color.BLACK);
            case EYEBROWS_STRAIGHT:
                return SVGUtil.getSvg(SVGUtil.EYEBROWS_STRAIGHT, Color.BLACK);
            default:
                return "";
        }
    }

    public String addHair(String style, String hairC) {
        switch (style) {
            case HAIR_TOMAHAWK:
                return SVGUtil.getSvg(SVGUtil.HAIR_TOMAHAWK, hairC);
            case HAIR_SHORT_RUFFLED:
                return SVGUtil.getSvg(SVGUtil.HAIR_SHORT_RUFFLED, hairC);
            case HAIR_SHORT_CURLY:
                return SVGUtil.getSvg(SVGUtil.HAIR_SHORT_CURLY, hairC);
            case HAIR_UNDERCUT:
                return SVGUtil.getSvg(SVGUtil.HAIR_UNDERCUT, hairC);
            case HAIR_LONG:
                return SVGUtil.getSvg(SVGUtil.HAIR_LONG, hairC);
            default:
                return "";
        }
    }

    public String addHairBack(String style, String hairC) {
        switch (style) {
            case HAIR_LONG:
                return SVGUtil.getSvg(SVGUtil.HAIR_LONG_BACK, hairC);
            default:
                return "";
        }
    }

    public String addWeapon(String weapon) {
        switch (weapon) {
            case WEAPON_SWORD:
                return SVGUtil.getSvg(SVGUtil.WEAPON_SWORD, Color.BLACK);
            case WEAPON_BOW:
                return SVGUtil.getSvg(SVGUtil.WEAPON_BOW, Color.BLACK);
            case WEAPON_AXE:
            default:
                return "";
        }
    }

    public String addWeaponFront(String weapon) {
        switch (weapon) {
            case WEAPON_AXE:
                return SVGUtil.getSvg(SVGUtil.WEAPON_AXE, Color.BLACK);
            case WEAPON_SWORD:
            case WEAPON_BOW:
            default:
                return "";
        }
    }

    private String addCloth(String clothC) {
        return SVGUtil.getSvg(SVGUtil.CLOTH, clothC);
    }

    private boolean containsEquip(String[] equip, String toCheck) {
        return Arrays.stream(equip).anyMatch(toCheck::equals);
    }
}

