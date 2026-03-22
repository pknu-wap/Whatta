package whatta.Whatta.user.setting.payload.response;

import lombok.Builder;

@Builder
public record ReminderNotiResponse(
        String id,

        int day,
        int hour,
        int minute

) {
}
