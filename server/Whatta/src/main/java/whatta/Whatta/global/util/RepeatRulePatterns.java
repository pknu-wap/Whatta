package whatta.Whatta.global.util;

import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.util.regex.Pattern;
import java.util.Locale;

@NoArgsConstructor
public class RepeatRulePatterns {

    public static final Pattern WEEK_DAY = Pattern.compile("^(MON|TUE|WED|THU|FRI|SAT|SUN)$");
    public static final Pattern MONTH_DAY = Pattern.compile("^D([1-9]|[12][0-9]|3[01])$"); //D1 ~ D31
    public static final Pattern MONTH_NTH = Pattern.compile("^([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //4WED 4번째 주 수요일
    public static final Pattern MONTH_LAST = Pattern.compile("^LAST(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //LASTWED 마지막 주 수요일
    public static final Pattern MONTH_LAST_DAY = Pattern.compile("^LASTDAY$");

    public static String normalizeToken(String token) {
        return token.toUpperCase(Locale.ROOT).replace(" ", "");
    }

    public static DayOfWeek toDayOfWeek(String token) {
        return switch (token) {
            case "MON" -> DayOfWeek.MONDAY;
            case "TUE" -> DayOfWeek.TUESDAY;
            case "WED" -> DayOfWeek.WEDNESDAY;
            case "THU" -> DayOfWeek.THURSDAY;
            case "FRI" -> DayOfWeek.FRIDAY;
            case "SAT" -> DayOfWeek.SATURDAY;
            case "SUN" -> DayOfWeek.SUNDAY;
            default -> throw new IllegalArgumentException("Unknown weekday code: " + token);
        };
    }
}