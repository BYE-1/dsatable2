package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.util.SVGUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.EnvironmentObjectTypeDto;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.awt.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/env-object")
public class EnvironmentObjectController {

    private static final Logger logger = LoggerFactory.getLogger(EnvironmentObjectController.class);

    public static final String PARAM_TYPE = "type";
    public static final String PARAM_COLOR = "color";
    public static final String PARAM_SIZE = "size";

    public static final String TYPE_TREE1 = "tree1";
    public static final String TYPE_TREE2 = "tree2";
    public static final String TYPE_TREE3 = "tree3";
    public static final String TYPE_TREE4 = "tree4";
    public static final String TYPE_TREE5 = "tree5";
    public static final String TYPE_TREE6 = "tree6";
    public static final String TYPE_TREE7 = "tree7";
    public static final String TYPE_TREE8 = "tree8";
    public static final String TYPE_STONE = "stone";
    public static final String TYPE_HOUSE = "house";
    public static final String[] TYPE_OPTIONS = {TYPE_TREE1, TYPE_TREE2, TYPE_TREE3, TYPE_TREE4, TYPE_TREE5, TYPE_TREE6, TYPE_TREE7, TYPE_TREE8, TYPE_STONE, TYPE_HOUSE};

    // Tree colors
    public static final String TREE_COLOR_DEFAULT = "#228B22"; // Forest green
    public static final String TREE_COLOR_LIGHT = "#32CD32"; // Lime green
    public static final String STONE_COLOR_DEFAULT = "#696969"; // Dim gray
    public static final String STONE_COLOR_LIGHT = "#A9A9A9"; // Dark gray
    public static final String HOUSE_COLOR_DEFAULT = "#D2691E"; // Chocolate
    public static final String HOUSE_ROOF_COLOR_DEFAULT = "#8B4513"; // Saddle brown

    @GetMapping(produces = "image/svg+xml")
    public ResponseEntity<String> generateEnvironmentObject(
            @RequestParam(value = PARAM_TYPE, required = false) String type,
            @RequestParam(value = PARAM_COLOR, required = false) String color,
            @RequestParam(value = PARAM_SIZE, required = false) Integer size) {

        try {
            // Set defaults
            if (StringUtils.isEmpty(type)) {
                type = TYPE_TREE1;
            }
            if (StringUtils.isEmpty(color)) {
                color = getDefaultColor(type);
            } else {
                // Ensure color is properly decoded (Spring should do this, but be defensive)
                try {
                    color = URLDecoder.decode(color, StandardCharsets.UTF_8);
                } catch (Exception e) {
                    // If decoding fails, use as-is
                }
                // Ensure color starts with #
                if (!color.startsWith("#")) {
                    color = getDefaultColor(type);
                }
            }
            if (size == null || size < 20) {
                size = 80; // Default size
            }

            StringBuilder builder = new StringBuilder();

            // SVG opening with dynamic size
            builder.append("<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' ");
            builder.append("width='").append(size).append("' height='").append(size).append("' ");
            builder.append("viewBox='0 0 32 32'>");

            // Generate object based on type
            switch (type) {
                case TYPE_TREE1:
                    builder.append(addTree(1));
                    break;
                case TYPE_TREE2:
                    builder.append(addTree(2));
                    break;
                case TYPE_TREE3:
                    builder.append(addTree(3));
                    break;
                case TYPE_TREE4:
                    builder.append(addTree(4));
                    break;
                case TYPE_TREE5:
                    builder.append(addTree(5));
                    break;
                case TYPE_TREE6:
                    builder.append(addTree(6));
                    break;
                case TYPE_TREE7:
                    builder.append(addTree(7));
                    break;
                case TYPE_TREE8:
                    builder.append(addTree(8));
                    break;
                case TYPE_STONE:
                    builder.append(addStone(color));
                    break;
                case TYPE_HOUSE:
                    builder.append(addHouse());
                    break;
                default:
                    builder.append(addTree(1)); // Default to tree
            }

            builder.append(SVGUtil.SVG_CLOSE);

            String svgContent = SVGUtil.DOCTYPE + builder.toString();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("image/svg+xml"))
                    .header("Cache-Control", "public, max-age=604800") // Cache for 7 days
                    .body(svgContent);
        } catch (Exception e) {
            // Return error as SVG
            String errorSvg = SVGUtil.DOCTYPE +
                    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='100'>" +
                    "<rect x='0' y='0' width='400' height='100' fill='#ffcccc'/>" +
                    "<text x='200' y='50' text-anchor='middle' font-family='Arial, sans-serif' font-size='14' fill='#cc0000'>" +
                    "Error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error") +
                    "</text>" +
                    SVGUtil.SVG_CLOSE;
            return ResponseEntity.status(500)
                    .contentType(MediaType.parseMediaType("image/svg+xml"))
                    .body(errorSvg);
        }
    }

    private String addTree(int variant) {
        try {
            return SVGUtil.getSvgFromFile("tree"+variant);
        } catch (RuntimeException e) {
            logger.error("Failed to load tree{} SVG, falling back to tree1", variant, e);
            // Fallback to tree1 if variant not found
            if (variant != 1) {
                try {
                    return SVGUtil.getSvgFromFile("tree1");
                } catch (RuntimeException e2) {
                    logger.error("Failed to load fallback tree1 SVG", e2);
                    // Return empty SVG if all fails
                    return "<circle cx='40' cy='50' r='20' fill='#228B22'/>";
                }
            }
            throw e;
        }
    }

    private String addStone(String color) {
        return SVGUtil.getSvgFromFile("rock");
    }

    private String addHouse() {
        try {
            return SVGUtil.getSvgFromFile("house");
        } catch (RuntimeException e) {
            logger.error("Failed to load house SVG, using fallback", e);
            // Return fallback SVG
            return "<rect x='0' y='0' width='80' height='80' fill='#8B4513'/>" +
                   "<polygon points='0,0 80,0 60,40 20,40' fill='#654321'/>";
        }
    }

    private Color parseColor(String colorString, String defaultColor) {
        try {
            if (colorString.startsWith("#")) {
                return Color.decode(colorString);
            } else {
                return Color.decode(defaultColor);
            }
        } catch (Exception e) {
            return Color.decode(defaultColor);
        }
    }

    private Color brighten(Color color, float factor) {
        int r = Math.min(255, (int) (color.getRed() + (255 - color.getRed()) * factor));
        int g = Math.min(255, (int) (color.getGreen() + (255 - color.getGreen()) * factor));
        int b = Math.min(255, (int) (color.getBlue() + (255 - color.getBlue()) * factor));
        return new Color(r, g, b);
    }

    private String getDefaultColor(String type) {
        switch (type) {
            case TYPE_TREE1:
                return TREE_COLOR_DEFAULT;
            case TYPE_STONE:
                return STONE_COLOR_DEFAULT;
            case TYPE_HOUSE:
                return HOUSE_COLOR_DEFAULT;
            default:
                return TREE_COLOR_DEFAULT;
        }
    }

    private String getTypeLabel(String type) {
        switch (type) {
            case TYPE_TREE1:
                return "Tree1";
            case TYPE_TREE2:
                return "Tree2";
            case TYPE_TREE3:
                return "Tree3";
            case TYPE_TREE4:
                return "Tree4";
            case TYPE_TREE5:
                return "Tree5";
            case TYPE_TREE6:
                return "Tree6";
            case TYPE_TREE7:
                return "Tree7";
            case TYPE_TREE8:
                return "Tree8";
            case TYPE_STONE:
                return "Stone";
            case TYPE_HOUSE:
                return "House";
            default:
                return "Unknown";
        }
    }

    @GetMapping(value = "/types", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<EnvironmentObjectTypeDto>> getEnvironmentObjectTypes() {
        List<EnvironmentObjectTypeDto> types = new ArrayList<>();
        
        for (String type : TYPE_OPTIONS) {
            types.add(new EnvironmentObjectTypeDto(
                type,
                getTypeLabel(type),
                getDefaultColor(type),
                80 // Default size
            ));
        }
        
        return ResponseEntity.ok(types);
    }
}

