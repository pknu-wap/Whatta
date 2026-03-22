package whatta.Whatta.user.setting.payload.response;

import lombok.Builder;
import whatta.Whatta.user.setting.enums.NotifyDay;

@Builder
public record ScheduleSummaryNotiResponse(
        Boolean enabled,
        NotifyDay notifyDay,
        String time
) {
}
