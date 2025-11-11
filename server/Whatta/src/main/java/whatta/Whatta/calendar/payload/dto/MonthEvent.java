package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalTime;
import java.util.List;

@Builder
public record MonthEvent(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        LocalTime startTime,
        LocalTime endTime,

        Boolean isRepeat
) {
}
