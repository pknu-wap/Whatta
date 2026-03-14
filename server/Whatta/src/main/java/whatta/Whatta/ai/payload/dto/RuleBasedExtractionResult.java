package whatta.Whatta.ai.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

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
}
