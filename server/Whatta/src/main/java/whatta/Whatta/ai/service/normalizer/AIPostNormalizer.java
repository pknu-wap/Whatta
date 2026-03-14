package whatta.Whatta.ai.service.normalizer;

import org.springframework.stereotype.Component;
import whatta.Whatta.ai.payload.dto.NormalizedSchedule;
import whatta.Whatta.ai.payload.dto.ScheduleCandidate;
import whatta.Whatta.ai.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.ai.spec.ScheduleExtractionSpec;
import whatta.Whatta.event.enums.RepeatUnit;
import whatta.Whatta.event.payload.response.RepeatResponse;
import whatta.Whatta.global.util.LocalDateTimeUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@Component
public class AIPostNormalizer {

    public NormalizedSchedule normalizeRuleBasedCandidate(ScheduleCandidate candidate) {
        if (candidate == null) {
            return null;
        }

        return NormalizedSchedule.builder()
                .isScheduled(candidate.scheduled())
                .isEvent(candidate.type() == ScheduleCandidate.CandidateType.EVENT)
                .title(candidate.title())
                .startDate(candidate.startDate())
                .endDate(candidate.endDate())
                .startTime(candidate.startTime())
                .endTime(candidate.endTime())
                .dueDateTime(candidate.dueDateTime())
                .repeat(null)
                .build();
    }

    public List<NormalizedSchedule> normalizeLlmResponse(OpenAIScheduleResponse response) {
        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .filter(Objects::nonNull)
                .map(this::normalizeLlmItem)
                .toList();
    }

    private NormalizedSchedule normalizeLlmItem(OpenAIScheduleResponse.ScheduleItem raw) {
        String intent = raw.intent() == null ? "unrelated" : raw.intent();
        return switch (intent) {
            case "create_event" -> postProcessLlmEvent(raw);
            case "create_task" -> postProcessLlmTask(raw);
            default -> buildUnscheduledResult();
        };
    }

    private NormalizedSchedule postProcessLlmEvent(OpenAIScheduleResponse.ScheduleItem raw) {
        String title = raw.title().isBlank() ? "새로운 일정" : raw.title();
        LocalDate startDate = LocalDateTimeUtil.stringToLocalDate(raw.start_date());
        if (startDate == null) {
            startDate = LocalDate.now(ScheduleExtractionSpec.KST_ZONE_ID);
        }

        LocalDate endDate = LocalDateTimeUtil.stringToLocalDate(raw.end_date());
        if (endDate == null) {
            endDate = startDate;
        }

        LocalTime startTime = LocalDateTimeUtil.stringToLocalTime(raw.start_time());
        LocalTime endTime = LocalDateTimeUtil.stringToLocalTime(raw.end_time());
        if (endTime == null && startTime != null) {
            endTime = startTime.plusHours(1);
        }

        RepeatResponse repeat = postProcessLlmRepeat(raw.repeat());

        return NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(true)
                .title(title)
                .startDate(startDate)
                .endDate(endDate)
                .startTime(startTime)
                .endTime(endTime)
                .dueDateTime(null)
                .repeat(repeat)
                .build();
    }

    private NormalizedSchedule postProcessLlmTask(OpenAIScheduleResponse.ScheduleItem raw) {
        String title = raw.title().isBlank() ? "새로운 작업" : raw.title();
        LocalDateTime dueDateTime = LocalDateTimeUtil.stringToLocalDateTime(raw.due_date_time());
        LocalDate startDate = LocalDateTimeUtil.stringToLocalDate(raw.start_date());
        if (startDate == null && dueDateTime != null) {
            startDate = dueDateTime.toLocalDate();
        }

        LocalDate endDate = startDate;
        LocalTime startTime = LocalDateTimeUtil.stringToLocalTime(raw.start_time());
        LocalTime endTime = null;
        if (startTime == null) {
            if (dueDateTime != null) {
                startTime = dueDateTime.toLocalTime();
                endTime = startTime.plusHours(1);
            }
        } else {
            endTime = startTime.plusHours(1);
        }

        return NormalizedSchedule.builder()
                .isScheduled(true)
                .isEvent(false)
                .title(title)
                .startDate(startDate)
                .endDate(endDate)
                .startTime(startTime)
                .endTime(endTime)
                .dueDateTime(dueDateTime)
                .repeat(null)
                .build();
    }

    private RepeatResponse postProcessLlmRepeat(OpenAIScheduleResponse.AIResponseRepeat rawRepeat) {
        if (rawRepeat == null || !Boolean.TRUE.equals(rawRepeat.enabled())) {
            return null;
        }

        RepeatUnit unit = parseRepeatUnit(rawRepeat.unit());
        int interval = rawRepeat.interval();
        if (unit == null || interval == 0) {
            return null;
        }

        return RepeatResponse.builder()
                .interval(interval)
                .unit(unit)
                .on(rawRepeat.on() == null ? List.of() : rawRepeat.on())
                .endDate(LocalDateTimeUtil.stringToLocalDate(rawRepeat.deadline()))
                .exceptionDates(List.of())
                .build();
    }

    private RepeatUnit parseRepeatUnit(String unit) {
        try {
            return unit == null || unit.isBlank() ? null : RepeatUnit.valueOf(unit);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private NormalizedSchedule buildUnscheduledResult() {
        return NormalizedSchedule.builder()
                .isScheduled(false)
                .isEvent(false)
                .title("")
                .startDate(null)
                .endDate(null)
                .startTime(null)
                .endTime(null)
                .dueDateTime(null)
                .repeat(null)
                .build();
    }
}
