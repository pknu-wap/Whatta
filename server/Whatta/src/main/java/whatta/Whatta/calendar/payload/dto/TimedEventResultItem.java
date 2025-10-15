package whatta.Whatta.calendar.payload.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record TimedEventResultItem(
        String id,
        String title,
        String colorKey,
        List<Long> labels,
        LocalTime startTime,
        LocalTime endTime,

        boolean isPeriod,
        LocalDate startDate,
        LocalDate endDate,

        Boolean isRepeat
) {
}
