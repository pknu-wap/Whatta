package whatta.Whatta.event.enums;

import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;

import java.util.Arrays;

public enum EventClearField {
    TITLE("title"),
    CONTENT("content"),
    LABELS("labels"),
    START_TIME("startTime"),
    END_TIME("endTime"),
    REPEAT("repeat"),
    REMINDER_NOTI("reminderNoti");

    private final String key;

    EventClearField(String key) {
        this.key = key;
    }

    public static EventClearField parse(String fieldName) {
        return Arrays.stream(values())
                .filter(v -> v.key.equals(fieldName))
                .findFirst()
                .orElseThrow(() -> new RestApiException(ErrorCode.INVALID_FIELD_TO_CLEAR));
    }
}
