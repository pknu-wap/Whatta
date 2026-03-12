package whatta.Whatta.global.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

public class LocalDateTimeUtil {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final ChronoUnit DB_PRECISION = ChronoUnit.MILLIS;

    public static LocalDateTime stringToLocalDateTime(String dateTimeString) {
        if (dateTimeString == null || dateTimeString.isEmpty()) { return null; }
        return LocalDateTime.parse(dateTimeString, DATE_TIME_FORMATTER).truncatedTo(DB_PRECISION);
    }

    public static LocalDate stringToLocalDate(String dateString) {
        if (dateString == null || dateString.isEmpty()) { return null; }
        return LocalDate.parse(dateString, DATE_FORMATTER);
    }

    public static LocalTime stringToLocalTime(String timeString) {
        if (timeString == null || timeString.isEmpty()) { return null; }
        if (timeString.equals("24:00:00")) {
            return LocalTime.MAX.truncatedTo(DB_PRECISION);
        }
        return LocalTime.parse(timeString, TIME_FORMATTER).truncatedTo(DB_PRECISION);
    }

    public static String localTimeToString(LocalTime localTime) {
        if (localTime == null) { return null; }
        if (localTime.equals(LocalTime.MAX.truncatedTo(DB_PRECISION)) || localTime.equals(LocalTime.MAX)) {
            return "24:00:00";
        }
        return TIME_FORMATTER.format(localTime);
    }
}
