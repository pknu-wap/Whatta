package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.*;
import whatta.Whatta.global.label.payload.LabelItem;

import java.util.List;

@Builder
public record DailyResponse(
        List<LabelItem> labelPalette,
        List<AllDaySpanEvent> allDaySpanEvents,
        List<AllDayEvent> allDayEvents,
        List<AllDayTask> allDayTasks,
        List<TimedEvent> timedEvents,
        List<TimedTask> timedTasks
) {
}
