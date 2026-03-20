package whatta.Whatta.agent.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.payload.request.ScheduleExtractionRequest;
import whatta.Whatta.agent.payload.response.ScheduleExtractionResponse;
import whatta.Whatta.agent.service.extractor.LLMExtractor;
import whatta.Whatta.agent.service.normalizer.AgentPostNormalizer;
import whatta.Whatta.agent.service.normalizer.AgentPreNormalizer;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.List;

@Component
@AllArgsConstructor
@Slf4j
public class AIAsyncProcessor {

    private static final String DEFAULT_IMAGE_EXTRACTION_PROMPT = "이 이미지에서 일정 또는 할 일 생성에 필요한 정보만 추출해줘.";
    private static final String DEFAULT_IMAGE_DETAIL = "low";

    private final AgentPreNormalizer agentPreNormalizer;
    private final LLMExtractor llmExtractor;
    private final AgentPostNormalizer agentPostNormalizer;

    @Async("aiExecutor")
    public CompletableFuture<ScheduleExtractionResponse> processImage(String traceId, String userId, ScheduleExtractionRequest request) {
        long startedAt = System.nanoTime();

        try {
            List<NormalizedSchedule> items = executeImage(request);
            return CompletableFuture.completedFuture(
                    new ScheduleExtractionResponse(items)
            );
        } catch (Exception e) {
            log.error("[AI_IMAGE_ASYNC][ERROR] traceId={} requestType={} total_latency_ms={} message={}",
                    traceId,
                    request.hasImage() ? "IMAGE" : "TEXT_ONLY",
                    elapsedMillis(startedAt),
                    e.getMessage(),
                    e);
            return CompletableFuture.failedFuture(e);
        }
    }

    private List<NormalizedSchedule> executeImage(ScheduleExtractionRequest request) {
        ScheduleExtractionRequest.ScheduleExtractionForImage image = request.image();
        String promptText = request.hasText() ? agentPreNormalizer.normalize(request.text()) : DEFAULT_IMAGE_EXTRACTION_PROMPT;
        System.out.println(promptText);
        String imageUrl = resolveImageUrl(image);

        OpenAIClient.OpenAIExecutionResult result = llmExtractor.extractWithImage(promptText, imageUrl, DEFAULT_IMAGE_DETAIL);
        return agentPostNormalizer.normalizeLlmResponse(result.response());
    }

    private String resolveImageUrl(ScheduleExtractionRequest.ScheduleExtractionForImage image) {
        if (image == null) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }
        if (image.hasUrl()) {
            return image.url().trim();
        }
        String sanitizedData = image.sanitizedData();
        if (sanitizedData.isBlank()) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }
        return "data:" + image.resolvedMimeType() + ";base64," + sanitizedData;
    }

    private long elapsedMillis(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
