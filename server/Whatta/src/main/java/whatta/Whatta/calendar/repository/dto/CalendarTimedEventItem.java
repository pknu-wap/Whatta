package whatta.Whatta.calendar.repository.dto;

import lombok.Builder;
import whatta.Whatta.event.entity.Repeat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
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

        Repeat repeat
) {
}
