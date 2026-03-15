package whatta.Whatta.ai.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.ai.payload.dto.NormalizedSchedule;
import whatta.Whatta.ai.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.ai.payload.dto.ScheduleCandidate;
import whatta.Whatta.ai.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.ai.service.extracor.LLMExtractor;
import whatta.Whatta.ai.service.extracor.RuleBasedExtractor;
import whatta.Whatta.ai.service.normalizer.AIPostNormalizer;
import whatta.Whatta.ai.service.normalizer.AIPreNormalizer;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.util.List;

@Service
@AllArgsConstructor
public class AIService {

    private static final int RULE_PATH_MAX_LENGTH = 30;

    private final AIPreNormalizer aiPreNormalizer;
    private final RuleBasedExtractor ruleBasedExtractor;
    private final ScheduleCandidateResolver scheduleCandidateResolver;
    private final LLMExtractor llmExtractor;
    private final AIPostNormalizer aiPostNormalizer;

    public List<NormalizedSchedule> requestInput(String userId, String input) {
        if (input == null || input.isBlank()) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }

        String normalizedInput = aiPreNormalizer.normalize(input);
        RuleBasedExtractionResult extractionResult = ruleBasedExtractor.extract(input, normalizedInput);
        if (shouldUseRuleBasedExtraction(extractionResult)) { //llm으로 넘길지
            ScheduleCandidate candidate = scheduleCandidateResolver.resolve(extractionResult);
            if (candidate != null) {
                return List.of(aiPostNormalizer.normalizeRuleBasedCandidate(candidate, extractionResult.warnings()));
            }
        }

        OpenAIScheduleResponse rawResponse = llmExtractor.extract(normalizedInput);
        return aiPostNormalizer.normalizeLlmResponse(rawResponse);
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
        if (extractionResult.normalizedText() == null || extractionResult.normalizedText().length() > RULE_PATH_MAX_LENGTH) {
            return false;
        }

        boolean hasSimpleTaskSignal = extractionResult.deadlineCandidate() != null;
        boolean hasSimpleEventSignal = extractionResult.hasSingleDate() || extractionResult.hasSingleTime();
        boolean hasRecoverableInputWarning = extractionResult.warnings() != null && !extractionResult.warnings().isEmpty();
        return hasSimpleTaskSignal || hasSimpleEventSignal || hasRecoverableInputWarning;
    }
}
