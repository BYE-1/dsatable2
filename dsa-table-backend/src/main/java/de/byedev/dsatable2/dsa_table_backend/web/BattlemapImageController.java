package de.byedev.dsatable2.dsa_table_backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.byedev.dsatable2.dsa_table_backend.util.SVGUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapImageRequest;
import de.byedev.dsatable2.dsa_table_backend.web.dto.BattlemapTokenDto;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.zip.GZIPInputStream;
import java.util.zip.InflaterInputStream;

@RestController
@RequestMapping("/api/battlemap-image")
public class BattlemapImageController {

    private static final Logger logger = LoggerFactory.getLogger(BattlemapImageController.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.api.base-url:http://localhost:8080/api}")
    private String apiBaseUrl;

    public static final String PARAM_DATA = "data";

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

        // Render cell-based backgrounds
        int gridW = request.getGridWidth() != null && request.getGridWidth() > 0 ? request.getGridWidth() : 16;
        int gridH = request.getGridHeight() != null && request.getGridHeight() > 0 ? request.getGridHeight() : 16;
        List<Integer> cellBackgrounds = request.getCellBackgrounds();
        
        if (cellBackgrounds != null && !cellBackgrounds.isEmpty() && cellBackgrounds.size() >= gridW * gridH) {
            // Render each cell with its background color
            for (int row = 0; row < gridH; row++) {
                for (int col = 0; col < gridW; col++) {
                    int index = row * gridW + col;
                    if (index < cellBackgrounds.size()) {
                        int bgType = cellBackgrounds.get(index);
                        String color = getBackgroundColor(bgType);
                        int x = col * 32;
                        int y = row * 32;
                        builder.append("<rect x='").append(x).append("' y='").append(y)
                                .append("' width='32' height='32' fill='").append(color).append("'/>");
                    }
                }
            }
            logger.debug("Rendered {} cell backgrounds", cellBackgrounds.size());
        } else {
            // Fallback: solid default green background
            builder.append("<rect x='0' y='0' width='").append(width).append("' height='").append(height)
                    .append("' fill='#228B22'/>");
            logger.debug("No cell backgrounds provided, using default green background");
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
    
    // Background type IDs: 0=default/green, 1=grass, 2=earth, 3=rock, 4=sand
    private String getBackgroundColor(int bgType) {
        switch (bgType) {
            case 0: return "#228B22"; // Default green
            case 1: return "#90EE90"; // Light green (grass)
            case 2: return "#8B4513"; // Brown (earth)
            case 3: return "#696969"; // Dim gray (rock)
            case 4: return "#F4A460"; // Sandy brown (sand)
            default: return "#228B22"; // Default green
        }
    }
    
}

