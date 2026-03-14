package whatta.Whatta.ai.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.ai.payload.dto.NormalizedSchedule;
import whatta.Whatta.ai.payload.response.OpenAIScheduleResponse;
import whatta.Whatta.ai.spec.ScheduleExtractionSpec;
import whatta.Whatta.event.enums.RepeatUnit;
import whatta.Whatta.event.payload.response.RepeatResponse;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.util.LocalDateTimeUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
@Slf4j
public class AIService {

    private final OpenAIClient openAIClient;

    public List<NormalizedSchedule> requestInput(String userId, String input) {
        long totalStartNanos = System.nanoTime();
        if (input == null || input.isBlank()) {
            throw new RestApiException(ErrorCode.INVALID_REQUEST_TEXT);
        }

        long openAiStartNanos = System.nanoTime();
        OpenAIScheduleResponse rawResponse = openAIClient.callOpenApi(input);
        log.info("[OPENAI][TIMING] stage=service_openai_call duration_ms={} user_id={} item_count={}",
                elapsedMillis(openAiStartNanos),
                userId,
                rawResponse.items() == null ? 0 : rawResponse.items().size());

        //TODO: 프론트와 api 기획 회의 후 수정
        long normalizeStartNanos = System.nanoTime();
        List<NormalizedSchedule> normalized = rawResponse.items().stream()
                .filter(Objects::nonNull)
                .map(this::normalize)
                .toList();
        log.info("[OPENAI][TIMING] stage=service_normalize duration_ms={} normalized_count={}",
                elapsedMillis(normalizeStartNanos),
                normalized.size());
        log.info("[OPENAI][TIMING] stage=service_total duration_ms={} user_id={}",
                elapsedMillis(totalStartNanos),
                userId);
        return normalized;
    }

    private NormalizedSchedule normalize(OpenAIScheduleResponse.ScheduleItem raw) {
        String intent = (raw.intent() == null) ? "unrelated" : raw.intent();
        return switch (intent) {
            case "create_event" -> normalizeEvent(raw);
            case "create_task" -> normalizeTask(raw);
            default -> normalizeUnscheduled();
        };
    }

    private NormalizedSchedule normalizeEvent(OpenAIScheduleResponse.ScheduleItem raw) {
        String title = (raw.title().isBlank()) ? "새로운 일정" : raw.title();
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

        RepeatResponse repeat = null;
        if (raw.repeat() != null && raw.repeat().enabled()) {
            repeat = normalizedRepeat(raw.repeat());
        }

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

    private RepeatResponse normalizedRepeat(OpenAIScheduleResponse.AIResponseRepeat rawRepeat) {
        RepeatUnit unit = parseUnit(rawRepeat.unit());
        int interval = rawRepeat.interval();
        if (unit == null || interval == 0) {
            return null;
        }

        //검증 일부러 안함 (항상 옳은 값을 보장할 수 없음)
        return RepeatResponse.builder()
                .interval(interval)
                .unit(unit)
                .on(rawRepeat.on() == null ? List.of() : rawRepeat.on())
                .endDate(LocalDateTimeUtil.stringToLocalDate(rawRepeat.deadline()))
                .exceptionDates(List.of())
                .build();
    }
    private RepeatUnit parseUnit(String unit) {
        try {
            return (unit == null || unit.isBlank()) ? null : RepeatUnit.valueOf(unit);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private NormalizedSchedule normalizeTask(OpenAIScheduleResponse.ScheduleItem raw) {
        String title = (raw.title().isBlank()) ? "새로운 작업" : raw.title();
        LocalDateTime dueDateTime = LocalDateTimeUtil.stringToLocalDateTime(raw.due_date_time());
        LocalDate startDate = LocalDateTimeUtil.stringToLocalDate(raw.start_date());
        if (startDate == null && dueDateTime != null) {
            startDate = dueDateTime.toLocalDate();
        }
        LocalDate endDate = startDate;
        LocalTime startTime = LocalDateTimeUtil.stringToLocalTime(raw.start_time());
        LocalTime endTime = null;
        if(startTime == null) {
            if(dueDateTime != null) {
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

    private NormalizedSchedule normalizeUnscheduled() {
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

    private long elapsedMillis(long startNanos) {
        return Duration.ofNanos(System.nanoTime() - startNanos).toMillis();
    }

}
