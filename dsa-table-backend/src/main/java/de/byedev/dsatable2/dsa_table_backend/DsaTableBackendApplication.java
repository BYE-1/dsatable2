package de.byedev.dsatable2.dsa_table_backend;

import de.byedev.dsatable2.dsa_table_backend.model.Character;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.CharacterRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.GameSessionRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.HeroXMLParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@SpringBootApplication
public class DsaTableBackendApplication {

	private static final Logger LOG = LoggerFactory.getLogger(DsaTableBackendApplication.class);

	public static void main(String[] args) {
		SpringApplication.run(DsaTableBackendApplication.class, args);
	}

	@Bean
	CommandLineRunner initData(UserRepository userRepository,
							   GameSessionRepository gameSessionRepository,
							   CharacterRepository characterRepository,
							   PasswordEncoder passwordEncoder) {
		return args -> {
			// 1. Ensure default users
			String defaultUsername = "demo";
			User user = userRepository.findByUsername(defaultUsername)
					.orElseGet(() -> {
					User u = new User(defaultUsername, "Demo User", passwordEncoder.encode("demo123"));
					User saved = userRepository.save(u);
						LOG.info("Created default user with username '{}'", defaultUsername);
						return saved;
					});

			// 1b. Ensure second demo user
			String secondUsername = "demo2";
			User user2 = userRepository.findByUsername(secondUsername)
					.orElseGet(() -> {
						User u = new User(secondUsername, "Demo User 2", passwordEncoder.encode("demo123"));
						User saved = userRepository.save(u);
						LOG.info("Created second demo user with username '{}'", secondUsername);
						return saved;
					});

			// 2. Ensure dummy session
			String sessionTitle = "Demo Session";
			Optional<GameSession> existingSession = gameSessionRepository.findAll().stream()
					.filter(s -> sessionTitle.equals(s.getTitle()))
					.findFirst();

			GameSession session = existingSession.orElseGet(() -> {
				GameSession s = new GameSession();
				s.setTitle(sessionTitle);
				s.setDescription("Demo game session seeded on startup");
				s.setGameMaster(user);
				GameSession saved = gameSessionRepository.save(s);
				LOG.info("Created demo session '{}'", sessionTitle);
				return saved;
			});

			// 3. Ensure demo character from XML
			String heroName = "Fenia Fuxfell";
			boolean characterExists = characterRepository.findByName(heroName).isPresent();
			if (!characterExists) {
				try {
					ClassPathResource resource = new ClassPathResource("static/FeniaFuxfell.xml");
					if (!resource.exists()) {
						LOG.warn("Demo hero XML 'static/FeniaFuxfell.xml' not found on classpath.");
						return;
					}
					byte[] bytes = resource.getInputStream().readAllBytes();
					String xml = new String(bytes, StandardCharsets.UTF_8);

					Character c = HeroXMLParser.fromXmlData(xml);
					c.setOwner(user);
					c.setSession(session);
					// Initialize current resources based on calculated totals
					c.updateCalculated();
					c.setCurrentLife(c.getTotalLife());
					c.setCurrentAsp(c.getMagicEnergy());

					characterRepository.save(c);
					LOG.info("Created demo character '{}' from XML", heroName);
				} catch (Exception e) {
					LOG.warn("Failed to create demo character from XML: {}", e.getMessage());
				}
			}
		};
	}
}
