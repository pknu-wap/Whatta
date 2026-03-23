package whatta.Whatta.task.payload.response;

import lombok.Builder;

import java.util.List;

@Builder
public record TodayTaskSummaryResponse(
        List<TaskPlacedToday> placedToday,
        List<TaskDueToday> dueToday

) {
    @Builder
    public record TaskPlacedToday(
            String title,
            String placementTime,
            boolean complete,
            String dueDateTime
    ) { }
    @Builder
    public record TaskDueToday(
            String title,
            boolean complete,
            String dueDateTime
    ) { }

}
