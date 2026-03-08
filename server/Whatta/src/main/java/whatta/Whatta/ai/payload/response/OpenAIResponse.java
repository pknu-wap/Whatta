package whatta.Whatta.ai.payload.response;

import java.util.List;

public record OpenAIResponse(
        List<ScheduleItem> items
) {
    public record ScheduleItem(
            String intent,
            String title,
            String date_ref,
            String time_ref,
            String start_date,
            String end_date,
            String start_time,
            String end_time,
            String due_date_time,
            Repeat repeat
    ) {
    }

    public record Repeat(
            Boolean enabled,
            Integer interval,
            String unit,
            List<String> on,
            String deadline,
            List<String> exception_dates
    ) {
    }
}
