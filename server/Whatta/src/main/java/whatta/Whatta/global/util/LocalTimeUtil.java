package whatta.Whatta.global.util;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class LocalTimeUtil {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    public static LocalTime stringToLocalTime(String timeString) {
        if (timeString == null || timeString.isEmpty()) { return null; }
        if (timeString.equals("24:00:00")) {
            return LocalTime.MAX;
        }
        return LocalTime.parse(timeString, FORMATTER);
    }

    public static String localTimeToString(LocalTime localTime) {
        if (localTime == null) { return null; }
        if (localTime.equals(LocalTime.MAX)) {
            return "24:00:00";
        }
        return FORMATTER.format(localTime);
    }
}
