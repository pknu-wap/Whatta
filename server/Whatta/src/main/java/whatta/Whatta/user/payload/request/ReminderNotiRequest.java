package whatta.Whatta.user.payload.request;

public record ReminderNotiRequest(
        int day,
        int hour,
        int minute
) {
}
