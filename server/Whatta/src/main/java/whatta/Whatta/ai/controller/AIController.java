package whatta.Whatta.ai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.ai.service.AIService;
import whatta.Whatta.global.payload.Response;

@RestController
@RequestMapping("/api/ai")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "AI", description = "AI API")
@Slf4j
public class AIController {

    private final AIService aiService;

    @PostMapping
    @Operation(summary = "ai test", description = "openai를 테스트합니다.")
    public ResponseEntity<?> postOpenAIApi (@AuthenticationPrincipal String userId,
                                          @RequestBody String input) {
        log.info("[AI][INBOUND] userId={}, inputLength={}, input={}",
                userId,
                input == null ? 0 : input.length(),
                input);
        return Response.ok("success post input", aiService.postInput(userId, input));
    }
}
