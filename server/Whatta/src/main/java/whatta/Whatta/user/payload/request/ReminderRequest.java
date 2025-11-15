package whatta.Whatta.user.payload.request;

public record ReminderRequest(
        int day,
        int hour,
        int minute
) {
}
