package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record DayOfMonth(
        LocalDate date,
        List<MonthEvent> events,
        int taskCount,
        List<MonthTask> tasks
) {
}
