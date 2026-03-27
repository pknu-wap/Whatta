package whatta.Whatta.agent.service.normalizer;

import org.springframework.stereotype.Component;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.payload.dto.ScheduleCandidate;
import whatta.Whatta.agent.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;
import whatta.Whatta.agent.util.ScheduleTypeRules;
import whatta.Whatta.event.enums.RepeatUnit;
import whatta.Whatta.event.payload.response.RepeatResponse;
import whatta.Whatta.global.util.LocalDateTimeUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;

@Component
public class AgentPostNormalizer {

    public NormalizedSchedule normalizeRuleBasedCandidate(ScheduleCandidate candidate, Map<String, List<String>> warnings) {
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
                .warnings(warnings == null ? Map.of() : warnings)
                .build();
    }

    public List<NormalizedSchedule> normalizeLlmResponse(OpenAIScheduleResponse response) {
        return normalizeLlmResponse(response, Map.of());
    }

    public List<NormalizedSchedule> normalizeLlmResponse(OpenAIScheduleResponse response, Map<String, List<String>> inheritedWarnings) {
        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .filter(Objects::nonNull)
                .map(item -> normalizeLlmItem(item, inheritedWarnings))
                .toList();
    }

    private NormalizedSchedule normalizeLlmItem(OpenAIScheduleResponse.ScheduleItem raw, Map<String, List<String>> inheritedWarnings) {
        if (!raw.is_schedule()) {
            return buildUnscheduledResult(inheritedWarnings);
        }

        return classifyAndPostProcessScheduledItem(raw, inheritedWarnings);
    }

    private NormalizedSchedule classifyAndPostProcessScheduledItem(OpenAIScheduleResponse.ScheduleItem raw, Map<String, List<String>> inheritedWarnings) {
        if (isTaskLike(raw)) {
            return postProcessLlmTask(raw, inheritedWarnings);
        }
        return postProcessLlmEvent(raw, inheritedWarnings);
    }

    private boolean isTaskLike(OpenAIScheduleResponse.ScheduleItem raw) {
        if (raw == null) {
            return false;
        }

        return ScheduleTypeRules.looksLikeTaskTitle(raw.title());
    }

    private NormalizedSchedule postProcessLlmEvent(OpenAIScheduleResponse.ScheduleItem raw, Map<String, List<String>> inheritedWarnings) {
        String title = (raw.title() == null || raw.title().isBlank()) ? "새로운 일정" : raw.title();
        LocalDate startDate = LocalDateTimeUtil.stringToLocalDate(raw.start_date());
        if (startDate == null && !hasWarning(inheritedWarnings, "startDate")) {
            startDate = LocalDate.now(ScheduleExtractionSpec.KST_ZONE_ID);
        }

        LocalDate endDate = LocalDateTimeUtil.stringToLocalDate(raw.end_date());
        if (endDate == null && startDate != null) {
            endDate = startDate;
        }

        LocalTime startTime = LocalDateTimeUtil.stringToLocalTime(raw.start_time());
        LocalTime endTime = LocalDateTimeUtil.stringToLocalTime(raw.end_time());
        if (endTime == null && startTime != null) {
            endTime = startTime.plusHours(1);
        }

        RepeatResponse repeat = postProcessLlmRepeat(raw.repeat_rule());

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
                .warnings(copyWarnings(inheritedWarnings))
                .build();
    }

    private NormalizedSchedule postProcessLlmTask(OpenAIScheduleResponse.ScheduleItem raw, Map<String, List<String>> inheritedWarnings) {
        String title = (raw.title() == null || raw.title().isBlank()) ? "새로운 작업" : raw.title();
        LocalDateTime dueDateTime = LocalDateTimeUtil.stringToLocalDateTime(raw.due_date_time());
        LocalDate startDate = LocalDateTimeUtil.stringToLocalDate(raw.start_date());
        LocalTime startTime = LocalDateTimeUtil.stringToLocalTime(raw.start_time());

        if (startDate == null && dueDateTime != null && !hasWarning(inheritedWarnings, "startDate")) {
            startDate = dueDateTime.toLocalDate();
        }

        if (startDate == null && startTime != null && !hasWarning(inheritedWarnings, "startDate")) {
            startDate = LocalDate.now(ScheduleExtractionSpec.KST_ZONE_ID);
        }

        if (startTime == null && dueDateTime != null && !hasWarning(inheritedWarnings, "startTime")) {
            LocalTime dueTime = dueDateTime.toLocalTime();
            if (!LocalTime.MIDNIGHT.equals(dueTime)) { //dueDateTime 시간이 자정이라면 사용자가 입력을 "25일까지"처럼 날짜만 입력했을 가능성이 높음
                startTime = dueTime;
            }
        }

        LocalTime endTime = startTime == null ? null : startTime.plusHours(1);
        LocalDate endDate = startDate;

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
                .warnings(copyWarnings(inheritedWarnings))
                .build();
    }

    private RepeatResponse postProcessLlmRepeat(String rawRepeatRule) {
        if (rawRepeatRule == null || rawRepeatRule.isBlank()) {
            return null;
        }

        String normalized = rawRepeatRule.trim().toUpperCase(Locale.ROOT);

        if ("DAILY".equals(normalized)) {
            return RepeatResponse.builder()
                    .interval(1)
                    .unit(RepeatUnit.DAY)
                    .on(List.of())
                    .endDate(null)
                    .exceptionDates(List.of())
                    .build();
        }

        if (normalized.startsWith("WEEKLY:")) {
            String onPart = normalized.substring("WEEKLY:".length()).trim();
            if (onPart.isBlank()) {
                return null;
            }
            List<String> on = List.of(onPart.split(",")).stream()
                    .map(String::trim)
                    .filter(token -> !token.isBlank())
                    .toList();
            if (on.isEmpty()) {
                return null;
            }
            return RepeatResponse.builder()
                    .interval(1)
                    .unit(RepeatUnit.WEEK)
                    .on(on)
                    .endDate(null)
                    .exceptionDates(List.of())
                    .build();
        }

        if (normalized.startsWith("MONTHLY:DAY=")) {
            String day = normalized.substring("MONTHLY:DAY=".length()).trim();
            if (day.isBlank()) {
                return null;
            }
            return RepeatResponse.builder()
                    .interval(1)
                    .unit(RepeatUnit.MONTH)
                    .on(List.of("D" + day))
                    .endDate(null)
                    .exceptionDates(List.of())
                    .build();
        }

        if ("MONTHLY:LASTDAY".equals(normalized)) {
            return RepeatResponse.builder()
                    .interval(1)
                    .unit(RepeatUnit.MONTH)
                    .on(List.of("LASTDAY"))
                    .endDate(null)
                    .exceptionDates(List.of())
                    .build();
        }

        if (normalized.startsWith("MONTHLY:WEEK=")) {
            String payload = normalized.substring("MONTHLY:WEEK=".length()).trim();
            String[] parts = payload.split(",DAY=");
            if (parts.length != 2) {
                return null;
            }
            String week = parts[0].trim();
            String day = parts[1].trim();
            String token = "LAST".equals(week) ? "LAST" + day : week + day;
            return RepeatResponse.builder()
                    .interval(1)
                    .unit(RepeatUnit.MONTH)
                    .on(List.of(token))
                    .endDate(null)
                    .exceptionDates(List.of())
                    .build();
        }

        return null;
    }

    private RepeatUnit parseRepeatUnit(String unit) {
        try {
            return unit == null || unit.isBlank() ? null : RepeatUnit.valueOf(unit);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private NormalizedSchedule buildUnscheduledResult(Map<String, List<String>> inheritedWarnings) {
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
                .warnings(copyWarnings(inheritedWarnings))
                .build();
    }

    private boolean hasWarning(Map<String, List<String>> warnings, String key) {
        return warnings != null && warnings.containsKey(key) && warnings.get(key) != null && !warnings.get(key).isEmpty();
    }

    private Map<String, List<String>> copyWarnings(Map<String, List<String>> warnings) {
        if (warnings == null || warnings.isEmpty()) {
            return Map.of();
        }
        return warnings.entrySet().stream()
                .collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey,
                        entry -> List.copyOf(entry.getValue())
                ));
    }
}
