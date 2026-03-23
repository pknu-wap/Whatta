package whatta.Whatta.calendar.repository.dto;

import java.util.List;

public record CalendarTaskSummaryResult(
        List<CalendarTaskPlacedSummaryItem> placedToday,
        List<CalendarTaskDueSummaryItem> dueToday
) {
}
