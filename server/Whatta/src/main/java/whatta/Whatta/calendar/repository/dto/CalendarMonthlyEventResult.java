package whatta.Whatta.calendar.repository.dto;

import lombok.Builder;
import whatta.Whatta.event.entity.Repeat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
public record CalendarMonthlyEventResult(
        String id,
        String title,
        String colorKey,
        List<Long> labels,

        boolean isSpan,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime, //정렬에 사용

        Boolean isRepeat,
        Repeat repeat
) {
}
