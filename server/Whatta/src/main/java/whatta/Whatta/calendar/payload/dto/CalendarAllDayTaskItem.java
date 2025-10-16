package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record CalendarAllDayTaskItem(
        String id,
        String title,
        List<Long> labels,
        boolean completed
) {
}
