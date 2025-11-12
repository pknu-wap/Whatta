package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
public record MonthSpanEvent(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        LocalDate startDate,
        LocalDate endDate,

        LocalTime startTime,
        LocalTime endTime,

        Boolean isRepeat
) {
}
