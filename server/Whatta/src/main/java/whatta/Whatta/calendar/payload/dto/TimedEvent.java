package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Builder
public record TimedEvent(
        String id,
        String title,
        String colorKey,
        List<Long> labels,
        LocalTime clippedStartTime,
        LocalTime clippedEndTime,

        boolean isSpan,
        LocalDateTime startAt,
        LocalDateTime endAt,

        Boolean isRepeat
) {
}
