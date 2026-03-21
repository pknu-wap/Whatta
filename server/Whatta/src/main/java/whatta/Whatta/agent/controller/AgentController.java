package whatta.Whatta.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.agent.payload.request.ScheduleExtractionRequest;
import whatta.Whatta.agent.service.AgentService;
import whatta.Whatta.global.payload.Response;

import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/ai")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "AI", description = "AI Agent를 이용한 일정/할일 생성 API")
@Slf4j
public class AgentController {

    private final AgentService agentService;

    @PostMapping
    @Operation(summary = "AI 일정/할일 추출", description = "텍스트 또는 이미지를 기반으로 일정/할 일 생성 정보를 추출합니다."
            + "<br><br> <b>이미지 업로드 안내</b>"
            + "<br> - format : jpg | jpeg | png"
            + "<br> - data : Base64 인코딩된 이미지 데이터"
            + "<br> - url : 이미지를 불러올 수 있는 공개된 URL")
    public CompletableFuture<ResponseEntity<?>> extractSchedules (@AuthenticationPrincipal String userId,
                                                                @RequestBody @Validated ScheduleExtractionRequest request) {
        return agentService.createSchedules(userId, request)
                .thenApply(response -> Response.ok(
                        "success schedule extraction request",
                        response
                ));
    }
}
