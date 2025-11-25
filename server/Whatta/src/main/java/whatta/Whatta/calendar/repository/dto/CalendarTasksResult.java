package whatta.Whatta.calendar.repository.dto;

import java.util.List;

public record CalendarTasksResult(
        List<CalendarAllDayTaskItem> allDayTasks,
        List<CalendarTimedTaskItem> timedTasks
) {
}
