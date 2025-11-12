package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record MonthEvent(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        Boolean isRepeat
) {
}
