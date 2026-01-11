package de.byedev.dsatable2.dsa_table_backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.byedev.dsatable2.dsa_table_backend.service.BackgroundTextureService;
import de.byedev.dsatable2.dsa_table_backend.util.SVGUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapImageRequest;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapTokenDto;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;
import java.util.zip.InflaterInputStream;

@RestController
@RequestMapping("/api/battlemap-image")
public class BattlemapImageController {

    private static final Logger logger = LoggerFactory.getLogger(BattlemapImageController.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.api.base-url:http://localhost:8080/api}")
    private String apiBaseUrl;
    
    @Autowired
    private BackgroundTextureService textureService;

    public static final String PARAM_DATA = "data";

    /**
     * Get list of available background texture options
     */
    @GetMapping("/backgrounds")
    public ResponseEntity<List<Map<String, Object>>> getAvailableBackgrounds() {
        List<BackgroundTextureService.BackgroundTextureInfo> textures = textureService.getAllTextures();
        List<Map<String, Object>> result = textures.stream()
                .map(texture -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", texture.getId());
                    map.put("name", texture.getName());
                    map.put("displayName", texture.getDisplayName());
                    map.put("color", texture.getColor());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping(produces = "image/svg+xml")
    public ResponseEntity<String> generateBattlemapImage(
            @RequestParam(value = PARAM_DATA, required = true) String data) {

        logger.info("Received battlemap image request, data length: {}", data != null ? data.length() : 0);

        try {
            if (data == null || data.isEmpty()) {
                throw new IllegalArgumentException("Data parameter is empty");
            }
            
            // Spring automatically URL-decodes the parameter, so 'data' is already decoded
            // Handle URL-safe base64 (replace - with + and _ with /)
            // But first, check if it's already standard base64 or URL-safe
            String base64Data = data;
            
            // If it contains URL-safe characters, convert to standard base64
            if (data.contains("-") || data.contains("_")) {
                base64Data = data.replace('-', '+').replace('_', '/');
            }
            
            // Add padding if needed (base64 strings must be multiple of 4)
            int paddingNeeded = (4 - (base64Data.length() % 4)) % 4;
            if (paddingNeeded > 0) {
                base64Data += "=".repeat(paddingNeeded);
            }
            
            logger.debug("Base64 data after conversion, length: {}", base64Data.length());
            byte[] decodedBytes;
            try {
                decodedBytes = Base64.getDecoder().decode(base64Data);
            } catch (IllegalArgumentException e) {
                logger.error("Failed to decode base64: {}", e.getMessage());
                logger.debug("Base64 data (first 100 chars): {}", base64Data.length() > 100 ? base64Data.substring(0, 100) : base64Data);
                throw new IllegalArgumentException("Invalid base64 encoding: " + e.getMessage(), e);
            }
            
            if (decodedBytes == null || decodedBytes.length == 0) {
                throw new IllegalArgumentException("Decoded bytes are empty");
            }
            
            logger.debug("Decoded base64 bytes length: {}", decodedBytes.length);
            
            // Check if data is compressed (gzip) or uncompressed (raw JSON)
            String jsonString;
            if (decodedBytes.length >= 2 && decodedBytes[0] == 0x1f && decodedBytes[1] == (byte)0x8b) {
                // GZIP magic number (0x1f 0x8b)
                logger.debug("Detected GZIP compressed data");
                jsonString = inflateToString(decodedBytes);
            } else if (decodedBytes.length > 0 && decodedBytes[0] == 0x7B) { // '{' character in UTF-8
                // Raw JSON (uncompressed) - starts with '{'
                logger.debug("Detected uncompressed JSON data");
                jsonString = new String(decodedBytes, StandardCharsets.UTF_8);
            } else {
                // Try to decompress anyway (might be deflate or other format)
                logger.debug("Unknown format, attempting decompression");
                jsonString = inflateToString(decodedBytes);
            }
            logger.info("Decoded JSON: {}", jsonString);

            // Parse JSON to BattlemapImageRequest
            BattlemapImageRequest imageRequest = objectMapper.readValue(jsonString, BattlemapImageRequest.class);
            logger.info("Parsed request - grid: {}x{}, pixels: {}x{}, tokens: {}, cellBackgrounds: {}", 
                    imageRequest.getGridWidth() != null ? imageRequest.getGridWidth() : "N/A",
                    imageRequest.getGridHeight() != null ? imageRequest.getGridHeight() : "N/A",
                    imageRequest.getPixelWidth(), imageRequest.getPixelHeight(),
                    imageRequest.getTokens() != null ? imageRequest.getTokens().size() : 0,
                    imageRequest.getCellBackgrounds() != null ? imageRequest.getCellBackgrounds().size() : 0);

            // Generate SVG with base URL from configuration
            String svgContent = generateSVG(imageRequest, apiBaseUrl);
            logger.debug("Generated SVG, length: {}", svgContent.length());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("image/svg+xml"))
                    .header("Cache-Control", "public, max-age=604800") // Cache for 7 days
                    .body(svgContent);

        } catch (IllegalArgumentException e) {
            logger.error("Invalid base64 encoding in battlemap image request", e);
            // Return 200 with error SVG so browser can display it
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("image/svg+xml"))
                    .body(createErrorSVG("Invalid base64 encoding: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Error processing battlemap image request", e);
            // Return 200 with error SVG so browser can display it
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("image/svg+xml"))
                    .body(createErrorSVG("Error processing battlemap data: " + errorMsg));
        }
    }


    private String generateSVG(BattlemapImageRequest request, String baseUrl) {
        // Get pixel dimensions from grid or fallback to canvas dimensions
        int width = request.getPixelWidth();
        int height = request.getPixelHeight();

        StringBuilder builder = new StringBuilder();

        // SVG opening with dimensions
        builder.append("<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' ");
        builder.append("width='").append(width).append("' height='").append(height).append("'>");

        appendDefs(builder);

        // Render cell-based backgrounds
        int gridW = request.getGridWidth() != null && request.getGridWidth() > 0 ? request.getGridWidth() : 16;
        int gridH = request.getGridHeight() != null && request.getGridHeight() > 0 ? request.getGridHeight() : 16;
        List<Integer> cellBackgrounds = request.getCellBackgrounds();
        
        if (cellBackgrounds != null && !cellBackgrounds.isEmpty() && cellBackgrounds.size() >= gridW * gridH) {
            // Group cells by texture type for efficient rendering
            Map<Integer, StringBuilder> textureClipPaths = new HashMap<>();
            
            for (int row = 0; row < gridH; row++) {
                for (int col = 0; col < gridW; col++) {
                    int index = row * gridW + col;
                    if (index < cellBackgrounds.size()) {
                        int bgType = cellBackgrounds.get(index);
                        int x = col * 32;
                        int y = row * 32;
                        
                        String textureName = textureService.getTextureName(bgType);
                        
                        if ("default".equals(textureName) || "earth".equals(textureName)) {
                            // Default or earth background - render directly
                            String color = getBackgroundColor(bgType);
                            builder.append("<rect x='").append(x).append("' y='").append(y)
                                    .append("' width='32' height='32' fill='").append(color).append("'/>");
                        } else {
                            // Texture-based background - add to clip path with squiggly edges
                            String squigglyPath = generateSquigglyPath(x, y, 32, 32, col, row);
                            textureClipPaths.computeIfAbsent(bgType, k -> new StringBuilder())
                                    .append(squigglyPath);
                        }
                    }
                }
            }
            
            // Render clip paths and textured backgrounds for each texture type
            for (Map.Entry<Integer, StringBuilder> entry : textureClipPaths.entrySet()) {
                int bgType = entry.getKey();
                String textureName = textureService.getTextureName(bgType);
                String clipPathId = textureName + "-clip";
                String filterId = textureService.getFilterId(bgType);
                String color = getBackgroundColor(bgType);
                
                // Add clip path definition
                builder.append("<defs id='").append(textureName).append("-clip-def'><clipPath id='")
                        .append(clipPathId).append("'>");
                builder.append(entry.getValue().toString());
                builder.append("</clipPath></defs>");
                
                // Render textured background with clip path
                String textureSvg = textureService.getTextureSvg(bgType);
                if (textureSvg != null && !textureSvg.isEmpty()) {
                    // Extract filter and pattern definitions from texture SVG
                    String textureDefs = extractDefsFromSvg(textureSvg);
                    if (!textureDefs.isEmpty()) {
                        builder.append("<defs>").append(textureDefs).append("</defs>");
                    }
                    
                    // Extract drawing elements (rects, paths, etc.) from texture SVG
                    String drawingElements = extractDrawingElementsFromSvg(textureSvg, clipPathId, width, height);
                    if (!drawingElements.isEmpty()) {
                        builder.append(drawingElements);
                    } else {
                        // Fallback: create a rect if no drawing elements found
                        builder.append("<rect x='0' y='0' width='").append(width).append("' height='").append(height)
                                .append("' fill='").append(color).append("'");
                        if (!filterId.isEmpty()) {
                            builder.append(" filter='").append(filterId).append("'");
                        }
                        builder.append(" clip-path='url(#").append(clipPathId).append(")'/>");
                    }
                } else {
                    // Fallback to solid color if texture not found
                    builder.append("<rect x='0' y='0' width='").append(width).append("' height='").append(height)
                            .append("' fill='").append(color).append("' clip-path='url(#").append(clipPathId).append(")'/>");
                }
            }
            
            logger.debug("Rendered {} cell backgrounds with {} texture types", cellBackgrounds.size(), textureClipPaths.size());
        } else {
            // Fallback: solid default earth background
            Integer earthId = textureService.getTextureId("earth");
            String earthColor = earthId != null ? getBackgroundColor(earthId) : "#8B4513"; // Earth brown
            builder.append("<rect x='0' y='0' width='").append(width).append("' height='").append(height)
                    .append("' fill='").append(earthColor).append("'/>");
            logger.debug("No cell backgrounds provided, using default earth background");
        }

        // Add water layer above backgrounds but below tokens
        boolean[] cellWater = request.decodeWater();
        if (cellWater != null && cellWater.length > 0) {
            logger.debug("Rendering water layer for {} cells", cellWater.length);
            builder.append(renderWaterLayer(cellWater, width, height, gridW, gridH));
        }

        // Add tokens/objects on top of background (last elements = top layer in SVG)
        // Include both regular tokens and environment objects from binary format
        List<BattlemapTokenDto> tokens = request.getAllTokens();
        if (tokens != null && !tokens.isEmpty()) {
            logger.debug("Adding {} tokens on top of background", tokens.size());
            for (BattlemapTokenDto token : tokens) {
                builder.append(addToken(token, baseUrl));
            }
        }

        builder.append(SVGUtil.SVG_CLOSE);

        return SVGUtil.DOCTYPE + builder.toString();
    }

    private void appendDefs(StringBuilder builder) {
        builder.append("<defs>");
        
        // Dynamically load all texture definitions
        List<BackgroundTextureService.BackgroundTextureInfo> textures = textureService.getAllTextures();
        Set<String> loadedTextures = new HashSet<>();
        
        for (BackgroundTextureService.BackgroundTextureInfo texture : textures) {
            String textureName = texture.getName();
            if (!"default".equals(textureName) && !loadedTextures.contains(textureName)) {
                try {
                    String svgContent = textureService.getTextureSvg(texture.getId());
                    if (svgContent != null && !svgContent.isEmpty()) {
                        // Extract and append defs from texture SVG
                        String defs = extractDefsFromSvg(svgContent);
                        if (!defs.isEmpty()) {
                            builder.append(defs);
                            loadedTextures.add(textureName);
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Failed to load texture defs for: {}", textureName, e);
                }
            }
        }
        
        // Always include water filter definition here so it's available for water layer
        try {
            String waterSvg = SVGUtil.getSvgFromFile("water");
            if (waterSvg != null && !waterSvg.isEmpty()) {
                String waterFilterDefs = extractDefsFromSvg(waterSvg);
                if (!waterFilterDefs.isEmpty()) {
                    builder.append(waterFilterDefs);
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to load water filter definitions", e);
        }
        
        builder.append("</defs>");
    }
    
    /**
     * Extract <defs> section from SVG content
     */
    private String extractDefsFromSvg(String svgContent) {
        if (svgContent == null || svgContent.isEmpty()) {
            return "";
        }
        
        // Look for <defs>...</defs> tags
        int defsStart = svgContent.indexOf("<defs");
        if (defsStart == -1) {
            return "";
        }
        
        // Find the closing > of the <defs tag (to handle attributes)
        int defsTagEnd = svgContent.indexOf(">", defsStart);
        if (defsTagEnd == -1) {
            return "";
        }
        
        int defsEnd = svgContent.indexOf("</defs>", defsTagEnd);
        if (defsEnd == -1) {
            return "";
        }
        
        // Extract everything from <defs to </defs>, excluding the closing </defs> tag
        // We'll wrap it in <defs> tags ourselves, so we extract the inner content
        return svgContent.substring(defsTagEnd + 1, defsEnd).trim();
    }
    
    /**
     * Extract drawing elements (rects, paths, etc.) from SVG content, excluding defs and svg tags.
     * Replaces clip-path references with our own clip path and scales to canvas size.
     */
    private String extractDrawingElementsFromSvg(String svgContent, String clipPathId, int canvasWidth, int canvasHeight) {
        if (svgContent == null || svgContent.isEmpty()) {
            return "";
        }
        
        // Remove SVG opening/closing tags and defs section
        String content = svgContent;
        
        // Remove <svg> opening tag (everything up to first > after <svg)
        int svgStart = content.indexOf("<svg");
        if (svgStart != -1) {
            int svgEnd = content.indexOf(">", svgStart);
            if (svgEnd != -1) {
                content = content.substring(svgEnd + 1);
            }
        }
        
        // Remove </svg> closing tag
        content = content.replaceAll("</svg>", "");
        
        // Remove defs section (already extracted separately)
        content = content.replaceAll("<defs[^>]*>.*?</defs>", "");
        
        // Remove comments
        content = content.replaceAll("<!--.*?-->", "");
        
        // Process each drawing element (rect, path, circle, etc.)
        StringBuilder result = new StringBuilder();
        
        // Find all drawing elements - handle both self-closing and paired tags
        // Match: <rect ... /> or <rect ...></rect> or <path ... /> etc.
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
            "<(rect|path|circle|ellipse|polygon|polyline|line|g|use|image|text)([^>]*?)(?:/>|>.*?</\\1>)",
            java.util.regex.Pattern.DOTALL | java.util.regex.Pattern.CASE_INSENSITIVE
        );
        
        java.util.regex.Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String tagName = matcher.group(1);
            String attributes = matcher.group(2);
            boolean isSelfClosing = matcher.group(0).endsWith("/>");
            
            // Process attributes: remove old clip-path, update dimensions, add our clip-path
            String processedAttrs = processAttributes(attributes, clipPathId, canvasWidth, canvasHeight);
            
            // Reconstruct element
            String element = "<" + tagName + processedAttrs;
            if (isSelfClosing) {
                element += "/>";
            } else {
                // For paired tags, we need to extract the content too
                String fullMatch = matcher.group(0);
                int contentStart = fullMatch.indexOf(">") + 1;
                int contentEnd = fullMatch.lastIndexOf("</" + tagName);
                if (contentEnd > contentStart) {
                    String elementContent = fullMatch.substring(contentStart, contentEnd);
                    element += ">" + elementContent + "</" + tagName + ">";
                } else {
                    element += "/>";
                }
            }
            
            result.append(element);
        }
        
        return result.toString();
    }
    
    /**
     * Process SVG element attributes: remove old clip-path, update dimensions, add our clip-path
     */
    private String processAttributes(String attributes, String clipPathId, int canvasWidth, int canvasHeight) {
        if (attributes == null) {
            attributes = "";
        }
        
        // Remove existing clip-path
        attributes = attributes.replaceAll("clip-path=['\"][^'\"]*['\"]", "");
        attributes = attributes.replaceAll("clip-path=[^\\s>]*", "");
        
        // Update width/height to canvas dimensions (for rects that fill the texture)
        attributes = attributes.replaceAll("width=['\"][^'\"]*['\"]", "width='" + canvasWidth + "'");
        attributes = attributes.replaceAll("height=['\"][^'\"]*['\"]", "height='" + canvasHeight + "'");
        
        // Update x/y to 0 (start from top-left)
        attributes = attributes.replaceAll("x=['\"][^'\"]*['\"]", "x='0'");
        attributes = attributes.replaceAll("y=['\"][^'\"]*['\"]", "y='0'");
        
        // Add our clip-path
        if (!attributes.trim().isEmpty() && !attributes.trim().endsWith(" ")) {
            attributes += " ";
        }
        attributes += "clip-path='url(#" + clipPathId + ")'";
        
        return " " + attributes.trim() + " ";
    }
    
    /**
     * Generate a squiggly/uneven path for a cell to create organic-looking edges
     * Uses pseudo-random variations based on cell position for consistency
     * Path extends beyond cell boundaries to prevent gaps
     */
    private String generateSquigglyPath(int x, int y, int width, int height, int col, int row) {
        // Use cell position as seed for pseudo-randomness (ensures same path for same cell)
        double seed = col * 137.5 + row * 97.3; // Use irrational multipliers for better distribution
        
        // Smaller squiggles for subtle organic look
        double waveAmplitude = 1.2;
        int numPoints = 6; // Points per side (fewer points for smoother curves)
        
        // Extend path by overlap amount to prevent gaps (each cell extends 2px on each side)
        int overlap = 2;
        int extendedX = x - overlap;
        int extendedY = y - overlap;
        int extendedWidth = width + overlap * 2;
        int extendedHeight = height + overlap * 2;
        
        StringBuilder path = new StringBuilder();
        path.append("<path d='");
        
        // Generate points for each edge with wavy variations
        // Start from top-left, go clockwise
        // Use the extended boundaries as the base for squiggles
        
        // Top edge
        path.append("M ").append(extendedX).append(",").append(extendedY);
        for (int i = 1; i <= numPoints; i++) {
            double t = (double)i / numPoints;
            double offset = waveAmplitude * Math.sin(seed + t * Math.PI * 2);
            double px = extendedX + t * extendedWidth;
            double py = extendedY + offset;
            path.append(" L ").append(px).append(",").append(py);
        }
        
        // Right edge
        for (int i = 1; i <= numPoints; i++) {
            double t = (double)i / numPoints;
            double offset = waveAmplitude * Math.sin(seed + 10.7 + t * Math.PI * 2);
            double px = extendedX + extendedWidth + offset;
            double py = extendedY + t * extendedHeight;
            path.append(" L ").append(px).append(",").append(py);
        }
        
        // Bottom edge (reverse direction)
        for (int i = numPoints - 1; i >= 0; i--) {
            double t = (double)i / numPoints;
            double offset = waveAmplitude * Math.sin(seed + 20.3 + t * Math.PI * 2);
            double px = extendedX + t * extendedWidth;
            double py = extendedY + extendedHeight + offset;
            path.append(" L ").append(px).append(",").append(py);
        }
        
        // Left edge (reverse direction)
        for (int i = numPoints - 1; i >= 0; i--) {
            double t = (double)i / numPoints;
            double offset = waveAmplitude * Math.sin(seed + 30.1 + t * Math.PI * 2);
            double px = extendedX + offset;
            double py = extendedY + t * extendedHeight;
            path.append(" L ").append(px).append(",").append(py);
        }
        
        path.append(" Z'/>"); // Close the path
        return path.toString();
    }

    private String addToken(BattlemapTokenDto token, String baseUrl) {
        if (token.getX() == null || token.getY() == null) {
            return "";
        }

        double x = token.getX();
        double y = token.getY();
        double size = 40; // Default token size

        StringBuilder builder = new StringBuilder();

        // Token circle/avatar
        // Check if this is an environment object (reconstruct URL from properties)
        String url = null;
        if (StringUtils.isNotBlank(token.getEnvType())) {
            // Reconstruct environment object URL from properties using base URL
            try {
                StringBuilder urlBuilder = new StringBuilder(baseUrl).append("/env-object?type=");
                urlBuilder.append(URLEncoder.encode(token.getEnvType(), StandardCharsets.UTF_8));
                if (StringUtils.isNotBlank(token.getEnvColor())) {
                    urlBuilder.append("&color=").append(URLEncoder.encode(token.getEnvColor(), StandardCharsets.UTF_8));
                }
                if (token.getEnvSize() != null) {
                    urlBuilder.append("&size=").append(token.getEnvSize());
                }
                url = urlBuilder.toString();
                // Use envSize if provided, otherwise default
                if (token.getEnvSize() != null) {
                    size = token.getEnvSize();
                }
            } catch (Exception e) {
                logger.warn("Error constructing environment object URL", e);
            }
        } else if (StringUtils.isNotBlank(token.getAvatarUrl())) {
            // Use avatar image URL if available
            url = token.getAvatarUrl().trim();
        }
        
        if (StringUtils.isNotBlank(url)) {
            // Use avatar/environment object image
            // Escape the URL properly for SVG href attribute
            String escapedUrl = escapeXmlAttribute(url);
            builder.append("<image x='").append(x - size / 2).append("' y='").append(y - size / 2)
                    .append("' width='").append(size).append("' height='").append(size).append("' ");
            builder.append("href='").append(escapedUrl).append("' ");
            builder.append("preserveAspectRatio='xMidYMid slice'/>");
        } else {
            // Use colored circle
            String fillColor = StringUtils.isNotBlank(token.getColor()) ? token.getColor() : "#808080";
            builder.append("<circle cx='").append(x).append("' cy='").append(y).append("' r='").append(size / 2)
                    .append("' fill='").append(fillColor).append("'");
            if (StringUtils.isNotBlank(token.getBorderColor())) {
                builder.append(" stroke='").append(token.getBorderColor()).append("' stroke-width='2'");
            } else {
                builder.append(" stroke='#000000' stroke-width='2'");
            }
            builder.append("/>");
        }

        return builder.toString();
    }

    private String inflateToString(byte[] compressedBytes) throws java.io.IOException {
        if (compressedBytes == null || compressedBytes.length == 0) {
            return "";
        }

        // Try gzip first (frontend uses gzip); fall back to raw DEFLATE for safety
        try {
            return inflateWithGzip(compressedBytes);
        } catch (java.io.IOException gzipEx) {
            logger.warn("GZIP decode failed, attempting raw DEFLATE fallback", gzipEx);
            return inflateWithDeflate(compressedBytes);
        }
    }

    private String inflateWithGzip(byte[] compressedBytes) throws java.io.IOException {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(compressedBytes);
             GZIPInputStream gzipInputStream = new GZIPInputStream(inputStream);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = gzipInputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            return outputStream.toString(StandardCharsets.UTF_8);
        }
    }

    private String inflateWithDeflate(byte[] compressedBytes) throws java.io.IOException {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(compressedBytes);
             InflaterInputStream inflaterInputStream = new InflaterInputStream(inputStream);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = inflaterInputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            return outputStream.toString(StandardCharsets.UTF_8);
        }
    }

    private String escapeXml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String escapeXmlAttribute(String text) {
        if (text == null) {
            return "";
        }
        // For attributes, we need to escape quotes and ampersands
        // But preserve URL encoding (like %23 for #)
        return text.replace("&", "&amp;")
                .replace("'", "&#39;")
                .replace("\"", "&quot;");
    }

    private String createErrorSVG(String errorMessage) {
        return SVGUtil.DOCTYPE +
                "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='100'>" +
                "<rect x='0' y='0' width='400' height='100' fill='#ffcccc'/>" +
                "<text x='200' y='50' text-anchor='middle' font-family='Arial, sans-serif' font-size='14' fill='#cc0000'>" +
                escapeXml(errorMessage) +
                "</text>" +
                SVGUtil.SVG_CLOSE;
    }
    
    /**
     * Get background color for a texture type ID
     */
    private String getBackgroundColor(int bgType) {
        if (textureService.isValidTextureId(bgType)) {
            String textureName = textureService.getTextureName(bgType);
            BackgroundTextureService.BackgroundTextureInfo info = textureService.getAllTextures().stream()
                    .filter(t -> t.getName().equals(textureName))
                    .findFirst()
                    .orElse(null);
            if (info != null) {
                return info.getColor();
            }
        }
        // Fallback to default colors for legacy types
        switch (bgType) {
            case 0: return "#8B4513"; // Default earth (brown)
            case 1: return "#90EE90"; // Light green (grass)
            case 2: return "#8B4513"; // Brown (earth)
            case 3: return "#696969"; // Dim gray (rock)
            case 4: return "#F4A460"; // Sandy brown (sand)
            default: return "#8B4513"; // Default earth (brown)
        }
    }
    
    /**
     * Render water layer for cells that have water
     * Creates a single path combining all water cells for better performance
     */
    private String renderWaterLayer(boolean[] cellWater, int canvasWidth, int canvasHeight, int gridWidth, int gridHeight) {
        StringBuilder builder = new StringBuilder();
        
        // Note: Water filter definition is now included in appendDefs() method
        // so it's available in the main <defs> section of the SVG
        
        // Build a single path that combines all water cells
        final int CELL_SIZE = 32;
        StringBuilder pathData = new StringBuilder();
        boolean hasWater = false;
        
        for (int i = 0; i < cellWater.length && i < gridWidth * gridHeight; i++) {
            if (cellWater[i]) {
                int row = i / gridWidth;
                int col = i % gridWidth;
                int x = col * CELL_SIZE;
                int y = row * CELL_SIZE;
                int ex = x + CELL_SIZE >= canvasWidth ? 15:0;
                int esx = x <= 0 ? -15:0;
                int ey = y + CELL_SIZE >= canvasHeight ? 15:0;
                int esy = y <= 0 ? -15:0;
                
                // Add rectangle to path: M (move to), then draw rectangle
                // Format: M x,y L x+width,y L x+width,y+height L x,y+height Z
                if (hasWater) {
                    pathData.append(" ");
                }
                pathData.append(String.format(
                    "M %d,%d L %d,%d L %d,%d L %d,%d Z",
                    x + esx, y + esy,                           // Top-left
                    x + CELL_SIZE + ex, y + esy,               // Top-right
                    x + CELL_SIZE + ex, y + CELL_SIZE + ey,   // Bottom-right
                    x + esx, y + CELL_SIZE + ey                 // Bottom-left
                ));
                hasWater = true;
            }
        }
        
        // Render single path with all water cells if any water exists
        // Use a base color - the filter's color matrix will transform it to the correct water color
        if (hasWater) {
            builder.append(String.format(
                "<path d='%s' fill='#003f7f' filter='url(#waterFilter)' fill-opacity='0.5' fill-rule='evenodd'/>",
                pathData.toString()
            ));
        }
        
        return builder.toString();
    }
}

