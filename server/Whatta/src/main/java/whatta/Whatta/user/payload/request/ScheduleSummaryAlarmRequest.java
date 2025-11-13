package whatta.Whatta.user.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import whatta.Whatta.user.enums.NotifyDay;

public record ScheduleSummaryAlarmRequest(
        Boolean enabled,
        NotifyDay notifyDay,
        @Schema(type = "string", format = "time", example = "09:00:00")
        String time
) {
}
