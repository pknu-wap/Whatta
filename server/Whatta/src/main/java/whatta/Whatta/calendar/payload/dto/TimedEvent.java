package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Builder
public record TimedEvent(
        String id,
        String title,
        String colorKey,
        List<Long> labels,
        LocalDate placementDate,
        LocalTime clippedStartTime,
        LocalTime clippedEndTime,

        boolean isPeriod,
        LocalDateTime startAt,
        LocalDateTime endAt,

        Boolean isRepeat
) {
}
