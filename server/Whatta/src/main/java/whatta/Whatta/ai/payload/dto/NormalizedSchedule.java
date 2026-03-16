package whatta.Whatta.ai.payload.dto;

import lombok.Builder;
import whatta.Whatta.event.payload.response.RepeatResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Builder
public record NormalizedSchedule(
        boolean isScheduled,
        boolean isEvent,
        String title,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime dueDateTime,
        RepeatResponse repeat

) {
}
