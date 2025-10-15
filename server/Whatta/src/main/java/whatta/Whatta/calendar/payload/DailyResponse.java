package whatta.Whatta.calendar.payload;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.CalendarDailyEventsResult;

@Builder
public record DailyResponse(
        CalendarDailyEventsResult events
) {
}
