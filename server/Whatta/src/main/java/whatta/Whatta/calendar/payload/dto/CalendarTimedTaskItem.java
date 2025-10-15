package whatta.Whatta.calendar.payload.dto;

import java.time.LocalTime;
import java.util.List;

public record CalendarTimedTaskItem(
        String id,
        String title,
        List<Long> labels,
        boolean completed,
        LocalTime placementTime
) {
}
