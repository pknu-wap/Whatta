package whatta.Whatta.calendar.repository.dto;

import lombok.Builder;
import whatta.Whatta.event.entity.Repeat;

import java.time.LocalDate;
import java.util.List;

@Builder
public record CalendarAllDayEventItem(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        boolean isSpan,
        LocalDate startDate,
        LocalDate endDate,

        Repeat repeat
) {
}
