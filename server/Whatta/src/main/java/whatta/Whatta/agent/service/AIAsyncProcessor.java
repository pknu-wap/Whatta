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
import whatta.Whatta.agent.util.ScheduleExtractionResultMessage;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.Image.service.ImageStorageService;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.List;

@Component
@AllArgsConstructor
@Slf4j
public class AIAsyncProcessor {

    private static final String DEFAULT_IMAGE_DETAIL = "low";

    private final AgentPreNormalizer agentPreNormalizer;
    private final LLMExtractor llmExtractor;
    private final AgentPostNormalizer agentPostNormalizer;
    private final ImageStorageService imageStorageService;

    @Async("aiExecutor")
    public CompletableFuture<ScheduleExtractionResponse> processImage(String traceId, String userId, ScheduleExtractionRequest request) {
        long startedAt = System.nanoTime();

        try {
            List<NormalizedSchedule> items = executeImage(userId, request);
            return CompletableFuture.completedFuture(
                    ScheduleExtractionResponse.builder()
                            .message(ScheduleExtractionResultMessage.from(items))
                            .schedules(items)
                            .build()
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

    private List<NormalizedSchedule> executeImage(String userId, ScheduleExtractionRequest request) {
        ScheduleExtractionRequest.ScheduleExtractionForImage image = request.image();
        String promptText = request.hasText() ? agentPreNormalizer.normalize(request.text()) : null;
        String uploadedObjectKey = image != null && image.hasObjectKey() ? image.sanitizedObjectKey() : null;

        try {
            String imageUrl = resolveImageUrl(userId, image);
            OpenAIClient.OpenAIExecutionResult result = llmExtractor.extractWithImage(promptText, imageUrl, DEFAULT_IMAGE_DETAIL);
            return agentPostNormalizer.normalizeLlmResponse(result.response());
        } finally {
            imageStorageService.deleteObjectQuietly(userId, uploadedObjectKey);
        }
    }

    private String resolveImageUrl(String userId, ScheduleExtractionRequest.ScheduleExtractionForImage image) {
        if (image == null) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }
        String objectKey = image.sanitizedObjectKey();
        if (objectKey.isBlank()) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }
        return imageStorageService.createDownloadSignedUrl(userId, objectKey);
    }

    private long elapsedMillis(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
