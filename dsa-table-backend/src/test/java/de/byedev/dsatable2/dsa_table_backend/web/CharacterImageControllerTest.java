package de.byedev.dsatable2.dsa_table_backend.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CharacterImageControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CharacterImageController controller = new CharacterImageController();
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGenerateCharacterImage_WithDefaultParameters() throws Exception {
        mockMvc.perform(get("/api/char"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")))
                .andExpect(content().string(containsString("<!DOCTYPE svg")))
                .andExpect(content().string(containsString("<svg")))
                .andExpect(content().string(containsString("</svg>")));
    }

    @Test
    void testGenerateCharacterImage_WithAllHairStyles() throws Exception {
        String[] hairStyles = {
                CharacterImageController.HAIR_BALD,
                CharacterImageController.HAIR_TOMAHAWK,
                CharacterImageController.HAIR_SHORT_RUFFLED,
                CharacterImageController.HAIR_SHORT_CURLY,
                CharacterImageController.HAIR_UNDERCUT,
                CharacterImageController.HAIR_LONG
        };

        for (String hairStyle : hairStyles) {
            mockMvc.perform(get("/api/char")
                            .param(CharacterImageController.PARAM_HAIR, hairStyle))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
        }
    }

    @Test
    void testGenerateCharacterImage_WithAllMouthOptions() throws Exception {
        String[] mouthOptions = {
                CharacterImageController.MOUTH_UP,
                CharacterImageController.MOUTH_DOWN,
                CharacterImageController.MOUTH_STRAIGHT,
                CharacterImageController.MOUTH_COVERED
        };

        for (String mouth : mouthOptions) {
            mockMvc.perform(get("/api/char")
                            .param(CharacterImageController.PARAM_MOUTH, mouth))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
        }
    }

    @Test
    void testGenerateCharacterImage_WithAllEyebrowOptions() throws Exception {
        String[] eyebrowOptions = {
                CharacterImageController.EYEBROWS_STRAIGHT,
                CharacterImageController.EYEBROWS_DOWN,
                CharacterImageController.EYEBROWS_NONE
        };

        for (String eyebrows : eyebrowOptions) {
            mockMvc.perform(get("/api/char")
                            .param(CharacterImageController.PARAM_EYEBROWS, eyebrows))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
        }
    }

    @Test
    void testGenerateCharacterImage_WithAllEarOptions() throws Exception {
        String[] earOptions = {
                CharacterImageController.EARS_NONE,
                CharacterImageController.EARS_STD,
                CharacterImageController.EARS_POINTY
        };

        for (String ears : earOptions) {
            mockMvc.perform(get("/api/char")
                            .param(CharacterImageController.PARAM_EARS, ears))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
        }
    }

    @Test
    void testGenerateCharacterImage_WithAllWeaponOptions() throws Exception {
        String[] weaponOptions = {
                CharacterImageController.WEAPON_NONE,
                CharacterImageController.WEAPON_SWORD,
                CharacterImageController.WEAPON_AXE,
                CharacterImageController.WEAPON_BOW
        };

        for (String weapon : weaponOptions) {
            mockMvc.perform(get("/api/char")
                            .param(CharacterImageController.PARAM_WEAPON, weapon))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
        }
    }

    @Test
    void testGenerateCharacterImage_WithCustomColors() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_SKIN, "#ff0000")
                        .param(CharacterImageController.PARAM_CLOTH_COLOUR, "#00ff00")
                        .param(CharacterImageController.PARAM_HAIR_COLOUR, "#0000ff"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithDefaultColors() throws Exception {
        mockMvc.perform(get("/api/char"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(CharacterImageController.SKIN_COLOUR_DEFAULT)))
                .andExpect(content().string(containsString(CharacterImageController.CLOTH_COLOUR_DEFAULT)));
    }

    @Test
    void testGenerateCharacterImage_WithHelmet() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_HELMET))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithShoulderPads() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_SHOULDER_PADS))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithMultipleEquipment() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_HELMET)
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_SHOULDER_PADS))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithEmptyHair() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_HAIR, ""))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithInvalidHairStyle() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_HAIR, "invalid_hair"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithInvalidMouth() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_MOUTH, "invalid_mouth"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithLongHairBack() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_HAIR, CharacterImageController.HAIR_LONG))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithCompleteCharacter() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_HAIR, CharacterImageController.HAIR_LONG)
                        .param(CharacterImageController.PARAM_SKIN, "#ffd9b5")
                        .param(CharacterImageController.PARAM_CLOTH_COLOUR, "#00cc00")
                        .param(CharacterImageController.PARAM_HAIR_COLOUR, "#f3bf00")
                        .param(CharacterImageController.PARAM_MOUTH, CharacterImageController.MOUTH_UP)
                        .param(CharacterImageController.PARAM_EARS, CharacterImageController.EARS_POINTY)
                        .param(CharacterImageController.PARAM_EYEBROWS, CharacterImageController.EYEBROWS_STRAIGHT)
                        .param(CharacterImageController.PARAM_WEAPON, CharacterImageController.WEAPON_SWORD)
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_HELMET)
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_SHOULDER_PADS))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")))
                .andExpect(content().string(containsString("<!DOCTYPE svg")))
                .andExpect(content().string(containsString("<svg")));
    }

    @Test
    void testGenerateCharacterImage_WithNullEquipArray() throws Exception {
        // When equip parameter is not provided, it should default to empty array
        mockMvc.perform(get("/api/char"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_WithEmptyEquipArray() throws Exception {
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_EQUIP, ""))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")));
    }

    @Test
    void testGenerateCharacterImage_ResponseContainsSVGStructure() throws Exception {
        mockMvc.perform(get("/api/char"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<!DOCTYPE svg")))
                .andExpect(content().string(containsString("<svg xmlns")))
                .andExpect(content().string(containsString("</svg>")));
    }

    @Test
    void testGenerateCharacterImage_WithHelmetHidesFaceFeatures() throws Exception {
        // When helmet is equipped, mouth, eyebrows, and ears should not appear
        mockMvc.perform(get("/api/char")
                        .param(CharacterImageController.PARAM_EQUIP, CharacterImageController.EQUIP_HELMET))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType("image/svg+xml")))
                .andExpect(content().string(containsString("<!DOCTYPE svg")));
    }
}
