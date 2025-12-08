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
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@SpringBootApplication
@EnableCaching
public class DsaTableBackendApplication {

	private static final Logger LOG = LoggerFactory.getLogger(DsaTableBackendApplication.class);

	public static void main(String[] args) {
		SpringApplication.run(DsaTableBackendApplication.class, args);
	}

	@SuppressWarnings("unused")
	@Bean
	@Transactional
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
			GameSession session;
			Optional<GameSession> existingSession = gameSessionRepository.findAll().stream()
					.filter(s -> sessionTitle.equals(s.getTitle()))
					.findFirst();

			if (existingSession.isPresent()) {
				// Reload the session to ensure playerIds collection is loaded
				session = gameSessionRepository.findById(existingSession.get().getId())
						.orElseGet(() -> {
							GameSession s = new GameSession();
							s.setTitle(sessionTitle);
							s.setDescription("Demo game session seeded on startup");
							s.setGameMasterId(user.getId());
							s.setPlayerIds(new java.util.HashSet<>());
							return gameSessionRepository.save(s);
						});
			} else {
				session = new GameSession();
				session.setTitle(sessionTitle);
				session.setDescription("Demo game session seeded on startup");
				session.setGameMasterId(user.getId());
				session.setPlayerIds(new java.util.HashSet<>());
				session = gameSessionRepository.save(session);
				LOG.info("Created demo session '{}'", sessionTitle);
			}

			// Ensure session has correct GM and initialize playerIds if null
			boolean needsSave = false;
			if (!user.getId().equals(session.getGameMasterId())) {
				session.setGameMasterId(user.getId());
				needsSave = true;
			}
			if (session.getPlayerIds() == null) {
				session.setPlayerIds(new java.util.HashSet<>());
				needsSave = true;
			}
			// Ensure user2 is in the players list
			if (!session.getPlayerIds().contains(user2.getId())) {
				session.getPlayerIds().add(user2.getId());
				needsSave = true;
			}
			if (needsSave) {
				gameSessionRepository.save(session);
			}

			// 3. Ensure demo character from XML (GM's character - should NOT be in session)
			String heroName = "Fenia Fuxfell";
			Optional<Character> existingFenia = characterRepository.findByName(heroName);
			if (existingFenia.isPresent()) {
				Character c = existingFenia.get();
				// GM's character should not be in session
				if (c.getSessionId() != null && c.getSessionId().equals(session.getId())) {
					c.setSessionId(null);
					characterRepository.save(c);
					LOG.info("Removed '{}' from demo session (GM's character)", heroName);
				}
			} else {
				try {
					ClassPathResource resource = new ClassPathResource("static/FeniaFuxfell.xml");
					if (!resource.exists()) {
						LOG.warn("Demo hero XML 'static/FeniaFuxfell.xml' not found on classpath.");
						return;
					}
					byte[] bytes = resource.getInputStream().readAllBytes();
					String xml = new String(bytes, StandardCharsets.UTF_8);

					Character c = HeroXMLParser.fromXmlData(xml);
					c.setOwnerId(user.getId());
					c.setSessionId(null); // GM's character should NOT be in session
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

			// 4. Ensure Krixnix character from XML for demo2 user (player's character - should be in session)
			String krixnixName = "Krixnix";
			Optional<Character> existingKrixnix = characterRepository.findByName(krixnixName);
			if (existingKrixnix.isPresent()) {
				Character c = existingKrixnix.get();
				// Player's character should be in session
				if (c.getSessionId() == null || !c.getSessionId().equals(session.getId())) {
					c.setSessionId(session.getId());
					characterRepository.save(c);
					LOG.info("Assigned '{}' to demo session", krixnixName);
				}
			} else {
				try {
					ClassPathResource resource = new ClassPathResource("static/Krixnix.xml");
					if (!resource.exists()) {
						LOG.warn("Krixnix hero XML 'static/Krixnix.xml' not found on classpath.");
						return;
					}
					byte[] bytes = resource.getInputStream().readAllBytes();
					String xml = new String(bytes, StandardCharsets.UTF_8);

					Character c = HeroXMLParser.fromXmlData(xml);
					c.setOwnerId(user2.getId());
					c.setSessionId(session.getId()); // Player's character should be in session
					// Initialize current resources based on calculated totals
					c.updateCalculated();
					c.setCurrentLife(c.getTotalLife());
					c.setCurrentAsp(c.getMagicEnergy());

					characterRepository.save(c);
					LOG.info("Created character '{}' from XML for user '{}'", krixnixName, secondUsername);
				} catch (Exception e) {
					LOG.warn("Failed to create Krixnix character from XML: {}", e.getMessage());
				}
			}
		};
	}
}
