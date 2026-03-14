package whatta.Whatta.ai.service;

import org.springframework.stereotype.Component;
import whatta.Whatta.ai.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.ai.payload.dto.ScheduleCandidate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class ScheduleCandidateResolver {

    public ScheduleCandidate resolve(RuleBasedExtractionResult extractionResult) {
        if (extractionResult == null || extractionResult.titleHint() == null || extractionResult.titleHint().isBlank()) {
            return null;
        }

        if (isTask(extractionResult)) {
            return resolveTaskCandidate(extractionResult);
        }
        if (isEvent(extractionResult)) {
            return resolveEventCandidate(extractionResult);
        }
        return null;
    }

    private boolean isTask(RuleBasedExtractionResult result) {
        return looksLikeTaskTitle(result.titleHint()) || result.deadlineCandidate() != null;
    }

    private boolean isEvent(RuleBasedExtractionResult result) {
        return result.hasSingleDate() && !result.hasRepeatExpression(); //일정이 하나가 아니거나 반복이 있다면 llm으로 넘김
    }

    private ScheduleCandidate resolveTaskCandidate(RuleBasedExtractionResult extractionResult) {
        LocalDate deadline = extractionResult.deadlineCandidate();
        LocalTime time = extractionResult.hasSingleTime() ? extractionResult.timeCandidates().get(0) : null;
        LocalDateTime dueDateTime = deadline == null
                ? null
                : deadline.atTime(time == null ? LocalTime.of(23, 59, 59) : time);

        return ScheduleCandidate.builder()
                .type(ScheduleCandidate.CandidateType.TASK)
                .title(extractionResult.titleHint())
                .startDate(deadline)
                .endDate(deadline)
                .startTime(time)
                .endTime(time == null ? null : time.plusHours(1))
                .dueDateTime(dueDateTime)
                .allDay(time == null)
                .scheduled(deadline != null)
                .build();
    }

    private ScheduleCandidate resolveEventCandidate(RuleBasedExtractionResult extractionResult) {
        LocalDate startDate = extractionResult.hasSingleDate() ? extractionResult.dateCandidates().get(0) : extractionResult.referenceDate();
        LocalTime startTime = extractionResult.hasSingleTime() ? extractionResult.timeCandidates().get(0) : null;

        return ScheduleCandidate.builder()
                .type(ScheduleCandidate.CandidateType.EVENT)
                .title(extractionResult.titleHint())
                .startDate(startDate)
                .endDate(startDate)
                .startTime(startTime)
                .endTime(startTime == null ? null : startTime.plusHours(1))
                .dueDateTime(null)
                .allDay(startTime == null)
                .scheduled(true)
                .build();
    }

    private boolean looksLikeTaskTitle(String title) {
        return title.contains("제출")
                || title.contains("준비")
                || title.contains("작성")
                || title.contains("정리")
                || title.contains("하기")
                || title.contains("공부")
                || title.contains("과제");
    }
}
