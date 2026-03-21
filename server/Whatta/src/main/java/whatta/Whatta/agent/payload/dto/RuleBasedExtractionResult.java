package whatta.Whatta.agent.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Builder
public record RuleBasedExtractionResult(
        String originalText,
        String normalizedText,
        LocalDate referenceDate,
        List<LocalDate> dateCandidates,
        List<LocalTime> timeCandidates,
        LocalDate deadlineCandidate,
        boolean hasRepeatExpression,
        String titleHint,
        Map<String, List<String>> warnings,
        boolean ambiguousDate,
        boolean ambiguousTime,
        boolean hasMultipleItems
) {
    public boolean hasSingleDate() {
        return dateCandidates != null && dateCandidates.size() == 1;
    }

    public boolean hasSingleTime() {
        return timeCandidates != null && timeCandidates.size() == 1;
    }

    public boolean isAllDay() {
        return hasSingleDate() && (timeCandidates == null || timeCandidates.isEmpty());
    }
}
