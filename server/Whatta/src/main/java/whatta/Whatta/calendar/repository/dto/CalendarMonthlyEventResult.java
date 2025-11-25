package whatta.Whatta.calendar.repository.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CalendarMonthlyEventResult(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        boolean isSpan,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime, //정렬에 사용

        Boolean isRepeat
) {
}
