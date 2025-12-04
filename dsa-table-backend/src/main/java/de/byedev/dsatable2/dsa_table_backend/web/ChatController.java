package de.byedev.dsatable2.dsa_table_backend.web;

import de.byedev.dsatable2.dsa_table_backend.model.ChatMessage;
import de.byedev.dsatable2.dsa_table_backend.model.GameSession;
import de.byedev.dsatable2.dsa_table_backend.model.User;
import de.byedev.dsatable2.dsa_table_backend.repository.ChatMessageRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.GameSessionRepository;
import de.byedev.dsatable2.dsa_table_backend.repository.UserRepository;
import de.byedev.dsatable2.dsa_table_backend.util.JwtUtil;
import de.byedev.dsatable2.dsa_table_backend.web.dto.ChatMessageDto;
import de.byedev.dsatable2.dsa_table_backend.web.dto.ChatMessageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions/{sessionId}/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final GameSessionRepository gameSessionRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public ChatController(
            ChatMessageRepository chatMessageRepository,
            GameSessionRepository gameSessionRepository,
            UserRepository userRepository,
            JwtUtil jwtUtil) {
        this.chatMessageRepository = chatMessageRepository;
        this.gameSessionRepository = gameSessionRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(@PathVariable Long sessionId) {
        return chatMessageRepository.findBySession_IdOrderByCreatedAtAsc(sessionId).stream()
                .map(ChatMessageDto::new)
                .collect(Collectors.toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable Long sessionId,
            @RequestBody ChatMessageRequest request,
            @RequestHeader("Authorization") String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            
            User author = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            GameSession session = gameSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            ChatMessage chatMessage = new ChatMessage(session, author, request.getMessage());
            ChatMessage saved = chatMessageRepository.save(chatMessage);
            
            return ResponseEntity.ok(new ChatMessageDto(saved));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}

