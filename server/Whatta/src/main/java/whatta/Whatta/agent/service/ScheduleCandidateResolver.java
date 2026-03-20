package whatta.Whatta.agent.service;

import org.springframework.stereotype.Component;
import whatta.Whatta.agent.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.agent.payload.dto.ScheduleCandidate;
import whatta.Whatta.agent.util.ScheduleTypeRules;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class ScheduleCandidateResolver {

    public ScheduleCandidate resolve(RuleBasedExtractionResult extractionResult) {
        if (extractionResult == null || extractionResult.titleHint() == null || extractionResult.titleHint().isBlank()) {
            return null;
        }

        if (hasInvalidStartDateWarningWithoutDateCandidate(extractionResult)) {
            if (looksLikeTask(extractionResult)) {
                return resolveTaskCandidateWithInvalidDate(extractionResult);
            }
            return resolveEventCandidateWithInvalidDate(extractionResult);
        }

        if (isTask(extractionResult)) {
            return resolveTaskCandidate(extractionResult);
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
        return looksLikeTask(result) || result.deadlineCandidate() != null;
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
                .scheduled(true)
                .build();
    }

    private ScheduleCandidate resolveTaskCandidateWithInvalidDate(RuleBasedExtractionResult extractionResult) {
        LocalTime placementTime = extractionResult.hasSingleTime() ? extractionResult.timeCandidates().get(0) : null;

        return ScheduleCandidate.builder()
                .type(ScheduleCandidate.CandidateType.TASK)
                .title(extractionResult.titleHint())
                .startDate(null)
                .endDate(null)
                .startTime(placementTime)
                .endTime(placementTime == null ? null : placementTime.plusHours(1))
                .dueDateTime(null)
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
                .scheduled(false)
                .build();
    }

    private ScheduleCandidate resolveUnscheduledCandidate(RuleBasedExtractionResult extractionResult) {
        boolean taskLike = looksLikeTask(extractionResult) || extractionResult.deadlineCandidate() != null;

        return ScheduleCandidate.builder()
                .type(taskLike ? ScheduleCandidate.CandidateType.TASK : ScheduleCandidate.CandidateType.EVENT)
                .title(extractionResult.titleHint())
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .dueDateTime(null)
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

    private boolean looksLikeTask(RuleBasedExtractionResult extractionResult) {
        return ScheduleTypeRules.looksLikeTaskTitle(extractionResult.titleHint());
    }
}
