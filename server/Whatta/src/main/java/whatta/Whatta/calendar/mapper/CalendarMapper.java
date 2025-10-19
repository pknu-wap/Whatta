package whatta.Whatta.calendar.mapper;

import org.springframework.stereotype.Component;
import whatta.Whatta.calendar.payload.dto.*;
import whatta.Whatta.calendar.repository.dto.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class CalendarMapper {

    public AllDayEvent allDayEventItemToResponse(CalendarAllDayEventItem item) {
        return AllDayEvent.builder()
                .id(item.id())
                .title(item.title())
                .colorKey(item.colorKey())
                .labels(item.labels())
                .isRepeat(item.isRepeat())
                .build();
    }
    public AllDaySpanEvent allDayEventItemToSpanResponse(CalendarAllDayEventItem item) {
        return AllDaySpanEvent.builder()
                .id(item.id())
                .title(item.title())
                .colorKey(item.colorKey())
                .labels(item.labels())
                .isPeriod(item.isPeriod())
                .startDate(item.startDate())
                .endDate(item.endDate())
                .isRepeat(item.isRepeat())
                .build();
    }

    public AllDayTask allDayTaskItemToResponse(CalendarAllDayTaskItem item) {
        return AllDayTask.builder()
                .id(item.id())
                .title(item.title())
                .labels(item.labels())
                .completed(item.completed())
                .build();
    }

    public TimedEvent timedEventItemToResponse(CalendarTimedEventItem item, LocalTime start, LocalTime end) {
        return TimedEvent.builder()
                .id(item.id())
                .title(item.title())
                .colorKey(item.colorKey())
                .labels(item.labels())
                .clippedStartTime(start)
                .clippedEndTime(end)
                .isPeriod(item.isPeriod())
                .startAt(LocalDateTime.of(item.startDate(), item.startTime()))
                .endAt(LocalDateTime.of(item.endDate(), item.endTime()))
                .isRepeat(item.isRepeat())
                .build();
    }

    public TimedTask timedTaskItemToResponse(CalendarTimedTaskItem item) {
        return TimedTask.builder()
                .id(item.id())
                .title(item.title())
                .labels(item.labels())
                .completed(item.completed())
                .placementTime(item.placementTime())
                .build();
    }

    public MonthSpanEvent MonthlyEventResultToSpanResponse(CalendarMonthlyEventResult result) {
        return MonthSpanEvent.builder()
                .id(result.id())
                .title(result.title())
                .colorKey(result.colorKey())
                .labels(result.labels())
                .startDate(result.startDate())
                .endDate(result.endDate())
                .isRepeat(result.isRepeat())
                .build();
    }

    public MonthEvent MonthlyEventResultToResponse(CalendarMonthlyEventResult result) {
        return MonthEvent.builder()
                .id(result.id())
                .title(result.title())
                .colorKey(result.colorKey())
                .labels(result.labels())
                .isRepeat(result.isRepeat())
                .build();
    }
}
