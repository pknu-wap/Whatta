package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;

public record CalendarMonthlyTaskCountResult(
        LocalDate placementDate,
        int count
) {
}
