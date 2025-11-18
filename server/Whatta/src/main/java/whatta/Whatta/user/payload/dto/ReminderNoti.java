package whatta.Whatta.user.payload.dto;

import lombok.Builder;

@Builder
public record ReminderNoti (
        int day,
        int hour,
        int minute
){
}
