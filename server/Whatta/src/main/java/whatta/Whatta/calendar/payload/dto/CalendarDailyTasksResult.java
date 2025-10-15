package whatta.Whatta.calendar.payload.dto;

import java.util.List;

public record CalendarDailyTasksResult(
        List<CalendarAllDayTaskItem> allDayTasks,
        List<CalendarTimedTaskItem> timedTasks
) {
}
