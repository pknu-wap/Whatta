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
        if (hasInvalidStartDateWarningWithoutDateCandidate(extractionResult)) {
            return resolveEventCandidateWithInvalidDate(extractionResult);
        }
        if (isEvent(extractionResult)) {
            return resolveEventCandidate(extractionResult);
        }
        /*
        비정상적인 date & time & deadline 로 일정 확정이 안 되지만,
        입력 안에 복구 가능한 정보가 남아 있으면 완전히 버리지 말고 미확정 후보라도 만듦 ex) 3/33 캡디 회의 추가
        */
        if (hasRecoverableInputWarning(extractionResult)) {
            return resolveUnscheduledCandidate(extractionResult);
        }
        return null;
    }

    private boolean isTask(RuleBasedExtractionResult result) {
        return looksLikeTaskTitle(result.titleHint()) || result.deadlineCandidate() != null;
    }

    private boolean isEvent(RuleBasedExtractionResult result) {
        return result.hasSingleDate() && !result.hasRepeatExpression();
    }

    private ScheduleCandidate resolveTaskCandidate(RuleBasedExtractionResult extractionResult) {
        LocalDate deadline = extractionResult.deadlineCandidate();
        LocalDate placementDate = extractionResult.hasSingleDate() ? extractionResult.dateCandidates().get(0) : deadline;
        LocalTime placementTime = extractionResult.hasSingleTime() ? extractionResult.timeCandidates().get(0) : null;
        LocalDateTime dueDateTime = deadline == null
                ? null
                : deadline.atTime(placementTime == null ? LocalTime.of(23, 59, 59) : placementTime);

        return ScheduleCandidate.builder()
                .type(ScheduleCandidate.CandidateType.TASK)
                .title(extractionResult.titleHint())
                .startDate(placementDate)
                .endDate(placementDate)
                .startTime(placementTime)
                .endTime(placementTime == null ? null : placementTime.plusHours(1))
                .dueDateTime(dueDateTime)
                .allDay(extractionResult.isAllDay())
                .scheduled(true)
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
                .allDay(extractionResult.isAllDay())
                .scheduled(true)
                .build();
    }

    private ScheduleCandidate resolveEventCandidateWithInvalidDate(RuleBasedExtractionResult extractionResult) {
        LocalTime startTime = extractionResult.hasSingleTime() ? extractionResult.timeCandidates().get(0) : null;

        return ScheduleCandidate.builder()
                .type(ScheduleCandidate.CandidateType.EVENT)
                .title(extractionResult.titleHint())
                .startDate(null)
                .endDate(null)
                .startTime(startTime)
                .endTime(startTime == null ? null : startTime.plusHours(1))
                .dueDateTime(null)
                .allDay(startTime == null)
                .scheduled(false)
                .build();
    }

    private ScheduleCandidate resolveUnscheduledCandidate(RuleBasedExtractionResult extractionResult) {
        boolean taskLike = looksLikeTaskTitle(extractionResult.titleHint()) || extractionResult.deadlineCandidate() != null;

        return ScheduleCandidate.builder()
                .type(taskLike ? ScheduleCandidate.CandidateType.TASK : ScheduleCandidate.CandidateType.EVENT)
                .title(extractionResult.titleHint())
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .dueDateTime(null)
                .allDay(false)
                .scheduled(false)
                .build();
    }

    private boolean hasInvalidStartDateWarningWithoutDateCandidate(RuleBasedExtractionResult extractionResult) {
        return !extractionResult.hasSingleDate()
                && extractionResult.warnings() != null
                && extractionResult.warnings().containsKey("startDate");
    }

    private boolean hasRecoverableInputWarning(RuleBasedExtractionResult extractionResult) {
        return extractionResult.warnings() != null && !extractionResult.warnings().isEmpty();
    }

    private boolean looksLikeTaskTitle(String title) {
        return title.contains("제출")
                || title.contains("준비")
                || title.contains("작성")
                || title.contains("정리")
                || title.contains("하기")
                || title.contains("리기")
                || title.contains("보기")
                || title.contains("가기")
                || title.contains("내기")
                || title.contains("공부")
                || title.contains("과제");
    }
}
