package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.AllDaySpanEvent;
import whatta.Whatta.calendar.payload.dto.DayOfWeek;
import whatta.Whatta.global.label.payload.LabelItem;

import java.util.List;

@Builder
public record WeeklyResponse(
        List<LabelItem> labelPalette,
        List<AllDaySpanEvent> allDaySpanEvents, //시간 지정을 하지 않은 기간 일정
        List<DayOfWeek> days
) {
}
