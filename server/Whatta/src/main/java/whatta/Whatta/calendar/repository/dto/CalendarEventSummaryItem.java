package whatta.Whatta.calendar.repository.dto;

import lombok.Builder;
import whatta.Whatta.event.entity.Repeat;

import java.time.LocalDate;
import java.time.LocalTime;

@Builder
public record CalendarEventSummaryItem(
        String title,
        String content,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        Repeat repeat
) {
}
