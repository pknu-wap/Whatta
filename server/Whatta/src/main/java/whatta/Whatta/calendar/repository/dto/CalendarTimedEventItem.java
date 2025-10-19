package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CalendarTimedEventItem(
        String id,
        String title,
        String colorKey,
        List<Long> labels,
        LocalTime startTime,
        LocalTime endTime,

        boolean isSpan,
        LocalDate startDate,
        LocalDate endDate,

        Boolean isRepeat
) {
}
