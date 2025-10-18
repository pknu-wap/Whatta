package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record AllDayTask(
        String id,
        String title,
        List<Long> labels,
        boolean completed,
        LocalDate placementDate
) {
}
