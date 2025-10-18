package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.AllDayEvent;
import whatta.Whatta.calendar.payload.dto.WeekDay;

import java.util.List;

@Builder
public record WeeklyResponse(
        List<AllDayEvent> spanEvents, //시간 지정을 하지 않은 기간 일정
        List<WeekDay> days
) {
}
