package whatta.Whatta.calendar.payload.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarAllDayEventItem(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        boolean isPeriod,
        LocalDate startDate,
        LocalDate endDate,

        Boolean isRepeat
) {
}
