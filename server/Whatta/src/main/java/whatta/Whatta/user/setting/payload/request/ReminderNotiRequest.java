package whatta.Whatta.user.setting.payload.request;

public record ReminderNotiRequest(
        int day,
        int hour,
        int minute
) {
}
