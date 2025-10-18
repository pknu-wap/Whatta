package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CalendarTimedTaskItem(
        String id,
        String title,
        List<Long> labels,
        boolean completed,
        LocalDate placementDate,
        LocalTime placementTime
) {
}
