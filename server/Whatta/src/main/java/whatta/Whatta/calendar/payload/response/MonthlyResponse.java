package whatta.Whatta.calendar.payload.response;

import lombok.Builder;
import whatta.Whatta.calendar.payload.dto.MonthDay;
import whatta.Whatta.calendar.payload.dto.MonthSpanEvent;
import whatta.Whatta.global.label.payload.LabelItem;

import java.util.List;

@Builder
public record MonthlyResponse(
        List<LabelItem> labelPalette,
        List<MonthSpanEvent> spanEvents,
        List<MonthDay> days
) {
}
