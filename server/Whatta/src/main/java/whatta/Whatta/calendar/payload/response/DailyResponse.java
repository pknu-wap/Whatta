package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayEventItem;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayTaskItem;
import whatta.Whatta.calendar.repository.dto.CalendarTimedEventItem;
import whatta.Whatta.calendar.repository.dto.CalendarTimedTaskItem;

import java.util.List;

@Builder
public record DailyResponse(
        List<CalendarAllDayEventItem> allDayEvents,
        List<CalendarAllDayTaskItem> allDayTasks,
        List<CalendarTimedEventItem> timedEvents,
        List<CalendarTimedTaskItem> timedTasks
) {
}
