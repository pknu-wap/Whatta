package whatta.Whatta.user.setting.payload.dto;

import lombok.Builder;

@Builder
public record ReminderNoti (
        int day,
        int hour,
        int minute
){
}
