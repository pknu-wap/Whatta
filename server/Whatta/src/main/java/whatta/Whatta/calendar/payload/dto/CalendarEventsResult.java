package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record CalendarEventsResult(
        List<CalendarAllDayEventItem> allDayEvents,
        List<CalendarTimedEventItem> timedEvents
) {
}
