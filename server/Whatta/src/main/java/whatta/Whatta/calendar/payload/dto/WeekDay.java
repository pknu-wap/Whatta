package whatta.Whatta.calendar.payload.dto;

import java.time.LocalDate;
import java.util.List;

public record WeekDay(
        LocalDate date,
        List<CalendarAllDayEventItem> allDayEvents,
        List<CalendarAllDayTaskItem> allDayTasks,
        List<CalendarTimedEventItem> timedEvents,
        List<CalendarTimedTaskItem> timedTasks
) {
}
