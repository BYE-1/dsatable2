package de.byedev.dsatable2.dsa_table_backend.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BattlemapImageRequest {
    // Grid dimensions (in cells, 32px per cell)
    @JsonProperty("gw")
    private Integer gridWidth = 16;
    @JsonProperty("gh")
    private Integer gridHeight = 16;
    
    // Legacy pixel dimensions (for backward compatibility)
    @JsonProperty("w")
    private Integer canvasWidth;
    @JsonProperty("h")
    private Integer canvasHeight;
    
    // Cell backgrounds: array of background type IDs (0=default/green, 1=grass, 2=earth, 3=rock, 4=sand)
    // Array is in row-major order (row by row, left to right)
    @JsonProperty("bg")
    private List<Integer> cellBackgrounds;

    // Packed cell backgrounds: can be either:
    // 1. String (legacy base64 format)
    // 2. List<Integer> (new format: raw bytes as array of numbers)
    @JsonProperty("bgp")
    private Object cellBackgroundsPacked;
    
    @JsonProperty("ts")
    private List<BattlemapTokenDto> tokens;
    
    // Environment objects binary format (eob): packed binary data
    @JsonProperty("eob")
    private Object environmentObjectsBinary;
    
    // Cell water: packed as bits (8 cells per byte)
    // Can be either:
    // 1. String (base64 encoded)
    // 2. List<Integer> (raw bytes as array of numbers)
    @JsonProperty("wp")
    private Object cellWaterPacked;

    public BattlemapImageRequest() {
    }

    public Integer getGridWidth() {
        return gridWidth;
    }

    public void setGridWidth(Integer gridWidth) {
        this.gridWidth = gridWidth;
    }

    public Integer getGridHeight() {
        return gridHeight;
    }

    public void setGridHeight(Integer gridHeight) {
        this.gridHeight = gridHeight;
    }

    public Integer getCanvasWidth() {
        return canvasWidth;
    }

    public void setCanvasWidth(Integer canvasWidth) {
        this.canvasWidth = canvasWidth;
    }

    public Integer getCanvasHeight() {
        return canvasHeight;
    }

    public void setCanvasHeight(Integer canvasHeight) {
        this.canvasHeight = canvasHeight;
    }
    
    // Helper method to get pixel width (grid cells * 32px, or fallback to canvasWidth)
    public int getPixelWidth() {
        if (gridWidth != null && gridWidth > 0) {
            return gridWidth * 32;
        }
        return canvasWidth != null && canvasWidth > 0 ? canvasWidth : 512;
    }
    
    // Helper method to get pixel height (grid cells * 32px, or fallback to canvasHeight)
    public int getPixelHeight() {
        if (gridHeight != null && gridHeight > 0) {
            return gridHeight * 32;
        }
        return canvasHeight != null && canvasHeight > 0 ? canvasHeight : 512;
    }

    public List<BattlemapTokenDto> getTokens() {
        return tokens;
    }

    public void setTokens(List<BattlemapTokenDto> tokens) {
        this.tokens = tokens;
    }

    public List<Integer> getCellBackgrounds() {
        if (cellBackgrounds != null) {
            return cellBackgrounds;
        }
        return decodePackedBackgrounds();
    }

    public void setCellBackgrounds(List<Integer> cellBackgrounds) {
        this.cellBackgrounds = cellBackgrounds;
    }

    public Object getCellBackgroundsPacked() {
        return cellBackgroundsPacked;
    }

    public void setCellBackgroundsPacked(Object cellBackgroundsPacked) {
        this.cellBackgroundsPacked = cellBackgroundsPacked;
    }
    
    public Object getEnvironmentObjectsBinary() {
        return environmentObjectsBinary;
    }
    
    public void setEnvironmentObjectsBinary(Object environmentObjectsBinary) {
        this.environmentObjectsBinary = environmentObjectsBinary;
    }
    
    public Object getCellWaterPacked() {
        return cellWaterPacked;
    }
    
    public void setCellWaterPacked(Object cellWaterPacked) {
        this.cellWaterPacked = cellWaterPacked;
    }
    
    /**
     * Decode packed water data to boolean array
     */
    public boolean[] decodeWater() {
        if (cellWaterPacked == null) {
            return null;
        }
        
        byte[] bytes;
        
        // Handle List<Integer> format (array of bytes as numbers)
        if (cellWaterPacked instanceof List) {
            @SuppressWarnings("unchecked")
            List<Integer> byteList = (List<Integer>) cellWaterPacked;
            bytes = new byte[byteList.size()];
            for (int i = 0; i < byteList.size(); i++) {
                bytes[i] = byteList.get(i).byteValue();
            }
        }
        // Handle legacy format: String (base64 encoded)
        else if (cellWaterPacked instanceof String) {
            String packedString = (String) cellWaterPacked;
            if (packedString.isEmpty()) {
                return null;
            }
            try {
                bytes = Base64.getDecoder().decode(packedString);
            } catch (IllegalArgumentException ex) {
                return null;
            }
        } else {
            return null;
        }
        
        int totalCells = (gridWidth != null && gridHeight != null) ? gridWidth * gridHeight : 0;
        if (totalCells <= 0) {
            return null;
        }
        
        boolean[] result = new boolean[totalCells];
        int bitIndex = 0;
        
        for (byte b : bytes) {
            for (int bit = 0; bit < 8 && bitIndex < totalCells; bit++) {
                result[bitIndex++] = ((b >> bit) & 1) == 1;
            }
        }
        
        return result;
    }
    
    /**
     * Get all tokens including those converted from environment objects binary format
     */
    public List<BattlemapTokenDto> getAllTokens() {
        List<BattlemapTokenDto> allTokens = new ArrayList<>();
        
        // Add regular tokens
        if (tokens != null) {
            allTokens.addAll(tokens);
        }
        
        // Decode and add environment objects from binary format
        List<BattlemapTokenDto> envTokens = decodeEnvironmentObjects();
        if (envTokens != null && !envTokens.isEmpty()) {
            allTokens.addAll(envTokens);
        }
        
        return allTokens;
    }
    
    private List<BattlemapTokenDto> decodeEnvironmentObjects() {
        if (environmentObjectsBinary == null) {
            return null;
        }
        
        byte[] bytes;
        
        // Handle List<Integer> format (array of bytes as numbers)
        if (environmentObjectsBinary instanceof List) {
            @SuppressWarnings("unchecked")
            List<Integer> byteList = (List<Integer>) environmentObjectsBinary;
            bytes = new byte[byteList.size()];
            for (int i = 0; i < byteList.size(); i++) {
                bytes[i] = byteList.get(i).byteValue();
            }
        } else {
            return null;
        }
        
        List<BattlemapTokenDto> result = new ArrayList<>();
        String[] typeNames = {"tree", "stone", "house"};
        int byteIdx = 0;
        
        while (byteIdx < bytes.length) {
            if (byteIdx + 5 > bytes.length) break; // Need at least 5 bytes (type, x, y, flags)
            
            // Type (1 byte)
            int typeValue = bytes[byteIdx++] & 0xFF;
            String type = (typeValue < typeNames.length) ? typeNames[typeValue] : "tree";
            
            // X coordinate (2 bytes, little-endian)
            int x = (bytes[byteIdx++] & 0xFF) | ((bytes[byteIdx++] & 0xFF) << 8);
            
            // Y coordinate (2 bytes, little-endian)
            int y = (bytes[byteIdx++] & 0xFF) | ((bytes[byteIdx++] & 0xFF) << 8);
            
            // Flags (1 byte)
            int flags = bytes[byteIdx++] & 0xFF;
            boolean hasColor = (flags & 0x01) != 0;
            boolean hasSize = (flags & 0x02) != 0;
            
            // Color (3 bytes RGB) if present
            String color = null;
            if (hasColor) {
                if (byteIdx + 3 > bytes.length) break;
                int r = bytes[byteIdx++] & 0xFF;
                int g = bytes[byteIdx++] & 0xFF;
                int b = bytes[byteIdx++] & 0xFF;
                color = String.format("#%02x%02x%02x", r, g, b);
            }
            
            // Size (1 byte) if present
            Integer size = null;
            if (hasSize) {
                if (byteIdx >= bytes.length) break;
                size = (int)(bytes[byteIdx++] & 0xFF);
            }
            
            // Create token DTO from environment object
            BattlemapTokenDto token = new BattlemapTokenDto();
            token.setX((double) x);
            token.setY((double) y);
            token.setEnvType(type);
            token.setEnvColor(color);
            token.setEnvSize(size);
            token.setIsGmOnly(false);
            
            result.add(token);
        }
        
        return result;
    }

    private List<Integer> decodePackedBackgrounds() {
        if (cellBackgroundsPacked == null) {
            return null;
        }

        byte[] bytes;
        
        // Handle new format: List<Integer> (array of bytes as numbers)
        if (cellBackgroundsPacked instanceof List) {
            @SuppressWarnings("unchecked")
            List<Integer> byteList = (List<Integer>) cellBackgroundsPacked;
            bytes = new byte[byteList.size()];
            for (int i = 0; i < byteList.size(); i++) {
                bytes[i] = byteList.get(i).byteValue();
            }
        } 
        // Handle legacy format: String (base64 encoded)
        else if (cellBackgroundsPacked instanceof String) {
            String packedString = (String) cellBackgroundsPacked;
            if (packedString.isEmpty()) {
                return null;
            }
            try {
                bytes = Base64.getDecoder().decode(packedString);
            } catch (IllegalArgumentException ex) {
                return null;
            }
        } else {
            return null;
        }

        int totalCells = (gridWidth != null && gridHeight != null) ? gridWidth * gridHeight : 0;
        if (totalCells <= 0) {
            return null;
        }

        // Detect format: if bytes.length is approximately totalCells/2, it's 4-bit packed format
        // Otherwise, it's the new 5-bit RLE format
        boolean is4BitPacked = (bytes.length <= (totalCells / 2) + 1) && (bytes.length >= (totalCells / 2) - 1);
        
        List<Integer> result = new ArrayList<>(totalCells);
        
        if (is4BitPacked) {
            // Old 4-bit packed format: two values per byte (nibbles)
            for (int i = 0; i < totalCells; i++) {
                int byteIndex = i >> 1;
                if (byteIndex >= bytes.length) {
                    result.add(0);
                    continue;
                }
                int b = bytes[byteIndex] & 0xff;
                int value = (i & 1) == 0 ? (b & 0x0f) : ((b >> 4) & 0x0f);
                result.add(value);
            }
        } else {
            // New 5-bit RLE format
            int byteIdx = 0;
            int resultIdx = 0;

            while (byteIdx < bytes.length && resultIdx < totalCells) {
                int currentByte = bytes[byteIdx] & 0xff;
                if (currentByte == 0xFF) { // RLE marker
                    if (byteIdx + 2 < bytes.length) {
                        int value = bytes[byteIdx + 1] & 0x1f; // 5 bits (0-31)
                        int count = bytes[byteIdx + 2] & 0xff;
                        for (int i = 0; i < count && resultIdx < totalCells; i++) {
                            result.add(value);
                            resultIdx++;
                        }
                        byteIdx += 3;
                    } else {
                        // Malformed RLE, treat remaining as default
                        break;
                    }
                } else {
                    // Direct value (1 byte per cell, 5 bits)
                    result.add(currentByte & 0x1f);
                    resultIdx++;
                    byteIdx++;
                }
            }

            // Fill remaining cells with default (0)
            while (resultIdx < totalCells) {
                result.add(0);
                resultIdx++;
            }
        }
        
        return result;
    }
}

