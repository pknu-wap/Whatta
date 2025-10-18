package whatta.Whatta.calendar.payload.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record WeekDay(
        LocalDate date,
        List<AllDayEvent> allDayEvents,
        List<AllDayTask> allDayTasks,
        List<TimedEvent> timedEvents,
        List<TimedTask> timedTasks
) {
}
