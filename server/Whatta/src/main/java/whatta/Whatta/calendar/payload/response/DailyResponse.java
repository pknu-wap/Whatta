package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.*;

import java.util.List;

@Builder
public record DailyResponse(
        List<CalendarAllDayEventItem> allDayEvents,
        List<CalendarAllDayTaskItem> allDayTasks,
        List<CalendarTimedEventItem> timedEvents,
        List<CalendarTimedTaskItem> timedTasks
) {
}
