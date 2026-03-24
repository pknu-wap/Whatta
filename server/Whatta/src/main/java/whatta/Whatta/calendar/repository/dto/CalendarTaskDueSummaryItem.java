package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDateTime;

public record CalendarTaskDueSummaryItem(
        String id,
        String title,
        boolean completed,
        LocalDateTime dueDateTime
) {
}
