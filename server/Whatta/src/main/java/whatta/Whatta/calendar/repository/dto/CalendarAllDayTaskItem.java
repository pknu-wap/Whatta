package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarAllDayTaskItem(
        String id,
        String title,
        List<Long> labels,
        boolean completed,
        LocalDate placementDate
) {
}
