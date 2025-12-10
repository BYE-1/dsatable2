package de.byedev.dsatable2.dsa_table_backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.byedev.dsatable2.dsa_table_backend.web.dto.ErrorResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        // Create ObjectMapper instance (Spring Boot should provide one, but we'll create our own to be safe)
        this.objectMapper = new ObjectMapper();
        this.objectMapper.findAndRegisterModules();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for stateless REST API
                .csrf(csrf -> csrf.disable())
                // Allow CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Stateless session management
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Configure authorization
                .authorizeHttpRequests(auth -> auth
                        // Allow public access to auth endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        // Allow character image generation (public endpoint)
                        .requestMatchers("/api/char", "/api/char/**").permitAll()
                        // Allow environment object image generation (public endpoint)
                        .requestMatchers("/api/env-object", "/api/env-object/**").permitAll()
                        // Allow battlemap image generation (public endpoint)
                        .requestMatchers("/api/battlemap-image", "/api/battlemap-image/**").permitAll()
                        // Allow Swagger UI and API docs
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()
                        // Allow H2 console (for development)
                        .requestMatchers("/h2-console/**").permitAll()
                        // Allow static resources
                        .requestMatchers("/static/**", "/favicon.ico").permitAll()
                        // Require authentication for all other API endpoints
                        .requestMatchers("/api/**").authenticated()
                        // Allow everything else (for now)
                        .anyRequest().permitAll()
                )
                // Add JWT filter before UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Allow H2 console frames (for development)
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                // Configure exception handling to return JSON errors
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            ErrorResponse errorResponse = new ErrorResponse(
                                    HttpStatus.UNAUTHORIZED.value(),
                                    "Unauthorized",
                                    "Authentication required",
                                    request.getRequestURI()
                            );
                            writeErrorResponse(response, errorResponse, HttpStatus.UNAUTHORIZED);
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            ErrorResponse errorResponse = new ErrorResponse(
                                    HttpStatus.FORBIDDEN.value(),
                                    "Forbidden",
                                    "You do not have permission to access this resource",
                                    request.getRequestURI()
                            );
                            writeErrorResponse(response, errorResponse, HttpStatus.FORBIDDEN);
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow Angular dev server (default port 4200) and production origins
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:4200",  // Angular dev server
                "http://localhost:3000",   // Alternative dev port
                "http://127.0.0.1:4200",
                "http://127.0.0.1:3000",
                "https://byedev.de",        // Production domain
                "https://www.byedev.de",    // Production domain with www
                "http://byedev.de",         // Production domain (HTTP)
                "http://www.byedev.de"      // Production domain with www (HTTP)
        ));
        
        // Allow common HTTP methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        
        // Allow common headers
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));
        
        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);
        
        // Cache preflight response for 1 hour
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }

    private void writeErrorResponse(jakarta.servlet.http.HttpServletResponse response, 
                                     ErrorResponse errorResponse, 
                                     HttpStatus status) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}

