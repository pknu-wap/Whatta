package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarMonthlyEventResult(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        boolean isSpan,
        LocalDate startDate,
        LocalDate endDate,

        Boolean isRepeat
) {
}
