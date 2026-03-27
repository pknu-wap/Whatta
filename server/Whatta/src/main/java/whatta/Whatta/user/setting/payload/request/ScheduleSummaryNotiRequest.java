package whatta.Whatta.user.setting.payload.request;

import io.swagger.v3.oas.annotations.media.Schema;
import whatta.Whatta.user.setting.enums.NotifyDay;

public record ScheduleSummaryNotiRequest(
        Boolean enabled,
        NotifyDay notifyDay,
        @Schema(type = "string", format = "time", example = "09:00:00")
        String time
) {
}
