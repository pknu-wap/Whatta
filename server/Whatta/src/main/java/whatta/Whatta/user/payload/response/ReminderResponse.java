package whatta.Whatta.user.payload.response;

import lombok.Builder;

@Builder
public record ReminderResponse(
        String id,

        int day,
        int hour,
        int minute

) {
}
