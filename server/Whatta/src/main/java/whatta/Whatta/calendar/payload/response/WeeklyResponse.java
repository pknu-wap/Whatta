package whatta.Whatta.calendar.payload.response;

import whatta.Whatta.calendar.payload.dto.CalendarAllDayEventItem;
import whatta.Whatta.calendar.payload.dto.WeekDay;

import java.util.List;

public record WeeklyResponse(
        List<CalendarAllDayEventItem> spans, //시간 지정을 하지 않은 기간 일정
        List<WeekDay> days
) {
}
