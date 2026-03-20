package whatta.Whatta.agent.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.agent.payload.dto.ScheduleCandidate;
import whatta.Whatta.agent.payload.request.ScheduleExtractionRequest;
import whatta.Whatta.agent.payload.response.ScheduleExtractionResponse;
import whatta.Whatta.agent.service.extractor.RuleBasedExtractor;
import whatta.Whatta.agent.service.extractor.LLMExtractor;
import whatta.Whatta.agent.service.normalizer.AgentPostNormalizer;
import whatta.Whatta.agent.service.normalizer.AgentPreNormalizer;
import whatta.Whatta.agent.util.ScheduleExtractionResultMessage;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AgentService {

    private final AIAsyncProcessor aiAsyncProcessor;
    private final AgentPreNormalizer agentPreNormalizer;
    private final RuleBasedExtractor ruleBasedExtractor;
    private final ScheduleCandidateResolver scheduleCandidateResolver;
    private final LLMExtractor llmExtractor;
    private final AgentPostNormalizer agentPostNormalizer;

    public CompletableFuture<ScheduleExtractionResponse> createSchedules(String userId, ScheduleExtractionRequest request) {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        boolean imageRequest = validateAndResolveRequest(request);

        if (imageRequest) {
            return aiAsyncProcessor.processImage(traceId, userId, request);
        }
        return CompletableFuture.completedFuture(processTextOnly(traceId, userId, request));
    }

    private boolean validateAndResolveRequest(ScheduleExtractionRequest request) {
        if (request == null) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }

        if (!request.hasImage()) {
            if (!request.hasText()) {
                throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
            }
            return false;
        }

        return true;
    }

    private ScheduleExtractionResponse processTextOnly(String traceId, String userId, ScheduleExtractionRequest request) {
        String normalizedInput = agentPreNormalizer.normalize(request.text());
        RuleBasedExtractionResult extractionResult = ruleBasedExtractor.extract(request.text(), normalizedInput);

        if (shouldUseRuleBasedExtraction(extractionResult)) { //llm으로 넘길지
            ScheduleCandidate candidate = scheduleCandidateResolver.resolve(extractionResult);
            if (candidate != null) {
                List<NormalizedSchedule> normalizedSchedules = List.of(
                        agentPostNormalizer.normalizeRuleBasedCandidate(candidate, extractionResult.warnings())
                );
                return ScheduleExtractionResponse.builder()
                        .message(ScheduleExtractionResultMessage.from(normalizedSchedules))
                        .schedules(normalizedSchedules)
                        .build();
            }
        }

        OpenAIClient.OpenAIExecutionResult rawResponse = llmExtractor.extractTextOnly(normalizedInput);
        List<NormalizedSchedule> normalizedSchedules = agentPostNormalizer.normalizeLlmResponse(rawResponse.response());

        return ScheduleExtractionResponse.builder()
                .message(ScheduleExtractionResultMessage.from(normalizedSchedules))
                .schedules(normalizedSchedules)
                .build();
    }

    private boolean shouldUseRuleBasedExtraction(RuleBasedExtractionResult extractionResult) {
        if (extractionResult == null) {
            return false;
        }
        if (extractionResult.hasMultipleItems() || extractionResult.ambiguousDate() || extractionResult.ambiguousTime()) {
            return false;
        }
        if (extractionResult.hasRepeatExpression()) {
            return false;
        }
        if (extractionResult.titleHint() == null || extractionResult.titleHint().isBlank()) {
            return false;
        }
        if (extractionResult.normalizedText() == null || extractionResult.normalizedText().length() > 30) {
            return false;
        }

        boolean hasSimpleTaskSignal = extractionResult.deadlineCandidate() != null;
        boolean hasSimpleEventSignal = extractionResult.hasSingleDate();
        boolean hasRecoverableInputWarning = extractionResult.warnings() != null && !extractionResult.warnings().isEmpty();
        return hasSimpleTaskSignal || hasSimpleEventSignal || hasRecoverableInputWarning;
    }
}
