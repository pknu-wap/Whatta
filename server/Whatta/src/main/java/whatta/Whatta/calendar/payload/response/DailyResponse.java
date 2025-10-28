package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.*;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayEventItem;
import whatta.Whatta.calendar.repository.dto.CalendarAllDayTaskItem;
import whatta.Whatta.calendar.repository.dto.CalendarTimedEventItem;
import whatta.Whatta.calendar.repository.dto.CalendarTimedTaskItem;
import whatta.Whatta.global.label.payload.LabelsResponse;

import java.util.List;

@Builder
public record DailyResponse(
        LabelsResponse labelPalette,
        List<AllDaySpanEvent> allDaySpanEvents,
        List<AllDayEvent> allDayEvents,
        List<AllDayTask> allDayTasks,
        List<TimedEvent> timedEvents,
        List<TimedTask> timedTasks
) {
}
