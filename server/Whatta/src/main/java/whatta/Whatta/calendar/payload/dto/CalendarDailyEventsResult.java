package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record CalendarDailyEventsResult(
        List<AllDayEventResultItem> allDayEvents,
        List<TimedEventResultItem> timedEvents
) {
}
