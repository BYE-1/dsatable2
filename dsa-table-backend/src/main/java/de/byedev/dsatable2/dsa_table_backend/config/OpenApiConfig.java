package de.byedev.dsatable2.dsa_table_backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI dsaTableOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("DSA Table Backend API")
                        .description("REST API for managing pen-and-paper game sessions, characters, and related data")
                        .version("v1.0")
                        .contact(new Contact()
                                .name("DSA Table Team")
                                .email("support@dsatable.example"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")));
    }
}


