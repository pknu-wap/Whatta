package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalTime;
import java.util.List;

@Builder
public record MonthTask(
        String id,
        String title,
        List<Long> labels,
        boolean completed,
        LocalTime placementTime
) {
}
