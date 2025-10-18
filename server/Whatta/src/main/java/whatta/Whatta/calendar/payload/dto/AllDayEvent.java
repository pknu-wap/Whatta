package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record AllDayEvent(
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
