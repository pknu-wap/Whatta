package whatta.Whatta.user.payload.response;

import lombok.Builder;
import whatta.Whatta.user.enums.NotifyDay;

@Builder
public record ScheduleSummaryResponse(
        Boolean enabled,
        NotifyDay notifyDay,
        String time
) {
}
