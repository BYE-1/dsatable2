package de.byedev.dsatable2.dsa_table_backend.service;

import de.byedev.dsatable2.dsa_table_backend.util.SVGUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to discover and manage background texture files.
 * Dynamically loads all SVG texture files from resources/static/svg/texture/
 */
@Service
public class BackgroundTextureService {

    private static final Logger logger = LoggerFactory.getLogger(BackgroundTextureService.class);
    private static final String TEXTURE_PATH = "static/svg/texture/";
    
    
    private final Map<Integer, String> textureIdToName = new LinkedHashMap<>();
    private final Map<String, Integer> textureNameToId = new HashMap<>();
    private final Map<String, BackgroundTextureInfo> textureInfo = new HashMap<>();
    
    @PostConstruct
    public void initialize() {
        try {
            
            // Discover all texture files by trying to load known ones
            // This works both in development and when packaged as JAR
            registerKnownTextures();
            
            logger.info("Initialized {} background textures: {}", textureIdToName.size(), textureIdToName);
        } catch (Exception e) {
            logger.error("Failed to initialize background textures", e);
            // Fallback to known textures
            registerKnownTextures();
        }
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
    
    private void registerKnownTextures() {
        // Known texture files that should exist (beyond legacy ones)
        String[] knownTextures = {"default", "brick", "grass", "grass2", "earth", "stone", "sand", "rubble"};
        for (String textureName : knownTextures) {
            try {
                // Check if texture exists by trying to load it
                Resource resource = new ClassPathResource(TEXTURE_PATH + textureName + ".svg");
                if (resource.exists()) {
                    // Skip if already registered
                    if (textureNameToId.containsKey(textureName)) {
                        continue;
                    }
                    
                    // Assign next available ID (starting from 5, after legacy 0-4)
                    int nextId = textureIdToName.isEmpty() ? 0 : 
                                 textureIdToName.keySet().stream().mapToInt(Integer::intValue).max().orElse(-1) + 1;
                    
                    textureIdToName.put(nextId, textureName);
                    textureNameToId.put(textureName, nextId);
                    
                    // Load texture info
                    try {
                        String svgContent = SVGUtil.getSvgFromFile("texture/" + textureName);
                        BackgroundTextureInfo info = extractTextureInfo(textureName, svgContent);
                        textureInfo.put(textureName, info);
                        logger.debug("Registered texture: {} (ID: {})", textureName, nextId);
                    } catch (Exception e) {
                        logger.warn("Failed to load texture info for: {}", textureName, e);
                        // Still register it, but with default info
                        textureInfo.put(textureName, new BackgroundTextureInfo(textureName, capitalize(textureName), getDefaultColor(textureName)));
                    }
                }
            } catch (Exception e) {
                logger.debug("Texture {} not found or failed to load: {}", textureName, e.getMessage());
            }
        }
    }
    
    private BackgroundTextureInfo extractTextureInfo(String name, String svgContent) {
        // Extract display name (capitalize first letter)
        String displayName = name.substring(0, 1).toUpperCase() + name.substring(1);
        
        // Try to extract color from SVG (look for fill attributes)
        String color = extractColorFromSvg(svgContent);
        
        return new BackgroundTextureInfo(name, displayName, color);
    }
    
    private String extractColorFromSvg(String svgContent) {
        // Try to find fill color in SVG
        // Look for patterns like fill="#228B22" or fill='#228B22'
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("fill=['\"](#[0-9A-Fa-f]{6})['\"]");
        java.util.regex.Matcher matcher = pattern.matcher(svgContent);
        if (matcher.find()) {
            return matcher.group(1);
        }
        // Default color if not found
        return "#808080";
    }
    
    /**
     * Get texture name for a given ID
     * Default fallback is earth instead of "default"
     */
    public String getTextureName(int textureId) {
        return textureIdToName.getOrDefault(textureId, "earth");
    }
    
    /**
     * Get texture ID for a given name
     */
    public Integer getTextureId(String textureName) {
        return textureNameToId.get(textureName);
    }
    
    /**
     * Check if a texture ID is valid
     */
    public boolean isValidTextureId(int textureId) {
        return textureIdToName.containsKey(textureId);
    }
    
    /**
     * Get all available background textures
     */
    public List<BackgroundTextureInfo> getAllTextures() {
        return textureIdToName.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    String name = entry.getValue();
                    BackgroundTextureInfo info = textureInfo.get(name);
                    if (info == null) {
                        // Create default info if missing
                        String displayName = name.substring(0, 1).toUpperCase() + name.substring(1);
                        info = new BackgroundTextureInfo(name, displayName, getDefaultColor(name));
                    }
                    return new BackgroundTextureInfo(
                        name,
                        info.getDisplayName(),
                        info.getColor(),
                        entry.getKey()
                    );
                })
                .collect(Collectors.toList());
    }
    
    private String getDefaultColor(String textureName) {
        // Default colors for known textures
        switch (textureName.toLowerCase()) {
            case "default": return "#228B22"; // Green
            case "grass": return "#90EE90"; // Light green
            case "grass2": return "#2e7d32"; // Dark green
            case "earth": return "#8B4513"; // Brown
            case "stone": return "#696969"; // Dim gray
            case "sand": return "#F4A460"; // Sandy brown
            case "brick": return "#a84600"; // Brick red
            default: return "#808080"; // Gray
        }
    }
    
    /**
     * Get SVG content for a texture
     */
    public String getTextureSvg(int textureId) {
        String textureName = getTextureName(textureId);
        if ("default".equals(textureName)) {
            return null; // Default has no texture file
        }
        try {
            return SVGUtil.getSvgFromFile("texture/" + textureName);
        } catch (Exception e) {
            logger.warn("Failed to load texture SVG for ID {} ({})", textureId, textureName, e);
            return null;
        }
    }
    
    /**
     * Get filter ID for a texture (used in SVG filters)
     */
    public String getFilterId(int textureId) {
        String textureName = getTextureName(textureId);
        if ("default".equals(textureName)) {
            return "";
        }
        return "#" + textureName + "-filter";
    }
    
    /**
     * Background texture information DTO
     */
    public static class BackgroundTextureInfo {
        private final String name;
        private final String displayName;
        private final String color;
        private final Integer id;
        
        public BackgroundTextureInfo(String name, String displayName, String color) {
            this(name, displayName, color, null);
        }
        
        public BackgroundTextureInfo(String name, String displayName, String color, Integer id) {
            this.name = name;
            this.displayName = displayName;
            this.color = color;
            this.id = id;
        }
        
        public String getName() {
            return name;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public String getColor() {
            return color;
        }
        
        public Integer getId() {
            return id;
        }
    }
}

