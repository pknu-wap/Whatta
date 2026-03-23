package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;

public record CalendarTaskPlacedSummaryItem(
        String title,
        boolean completed,
        LocalTime placementTime,
        LocalDateTime dueDateTime
) {
}
