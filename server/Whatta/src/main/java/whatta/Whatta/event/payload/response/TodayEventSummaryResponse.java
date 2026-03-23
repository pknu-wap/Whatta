package whatta.Whatta.event.payload.response;

import lombok.Builder;

@Builder
public record TodayEventSummaryResponse(
        String title,
        String content,
        String startTime,
        String endTime
) {
}
