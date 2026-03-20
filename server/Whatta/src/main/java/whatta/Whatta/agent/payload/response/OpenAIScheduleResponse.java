package whatta.Whatta.agent.payload.response;

import java.util.List;

public record OpenAIScheduleResponse(
        List<ScheduleItem> items
) {
    public record ScheduleItem(
            Boolean is_schedule,
            String title,
            String start_date,
            String end_date,
            String start_time,
            String end_time,
            String due_date_time,
            String repeat_rule
    ) {
    }
}
