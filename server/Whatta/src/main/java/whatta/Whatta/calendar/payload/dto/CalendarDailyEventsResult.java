package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record CalendarDailyEventsResult(
        List<CalendarAllDayEventItem> allDayEvents,
        List<CalendarTimedEventItem> timedEvents
) {
}
