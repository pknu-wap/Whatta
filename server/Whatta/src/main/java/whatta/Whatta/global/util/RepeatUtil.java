package whatta.Whatta.global.util;

import whatta.Whatta.global.repeat.Repeat;
import whatta.Whatta.global.repeat.RepeatUnit;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RepeatUtil {

    public static LocalDateTime findNextOccurrenceStartAfter(LocalDateTime startAt, Repeat repeat, LocalDateTime from) {
        RepeatUnit unit = repeat.getUnit();
        int interval = repeat.getInterval();
        LocalDate endDate = repeat.getEndDate();
        LocalTime startTime = startAt.toLocalTime();

        switch (unit) {
            case DAY:
                return findNextDaily(startAt.toLocalDate(), startTime, interval, endDate, from);
            case WEEK:
                return findNextWeekly(startAt.toLocalDate(), startTime, interval, repeat.getOn(), endDate, from);
            case MONTH:
                return findNextMonthly(startAt.toLocalDate(), startTime, interval, repeat.getOn(), endDate, from);
            default:
                throw new IllegalArgumentException("Unsupported RepeatUnit: " + unit);
        }
    }

    public static LocalDateTime findNextDaily(LocalDate baseDate, LocalTime startTime, int interval, LocalDate endDate, LocalDateTime from) {
        LocalDateTime baseAt = LocalDateTime.of(baseDate, startTime);

        if (from.isBefore(baseAt)) {
            if (endDate != null && baseDate.isAfter(endDate)) {
                return null;
            }
            return baseAt;
        }

        /* 반복 조건에 맞는 가장 가까운 후보 날짜를 찾음 */
        long daysDiff = ChronoUnit.DAYS.between(baseAt.toLocalDate(), from.toLocalDate());
        long step = (daysDiff / interval) * interval;

        LocalDate candidateDate = baseDate.plusDays(step);
        LocalDateTime candidateAt = LocalDateTime.of(candidateDate, startTime);

        while (!candidateAt.isAfter(from)) { //candidateAt 가 from 이후가 될 때까지
            candidateDate = candidateDate.plusDays(interval);
            candidateAt = LocalDateTime.of(candidateDate, startTime);
        }

        if (endDate != null && candidateDate.isAfter(endDate)) {
            return null;
        }

        return candidateAt;
    }

    private static final Pattern WEEK_DAY = Pattern.compile("^(MON|TUE|WED|THU|FRI|SAT|SUN)$");

    public static LocalDateTime findNextWeekly(LocalDate baseDate, LocalTime startTime, int interval, List<String> on, LocalDate endDate, LocalDateTime from) {

        //MON -> DayOfWeek.MONDAY 로 변환
        List<DayOfWeek> daysOfWeek = new ArrayList<>();
        for (String token : on) {
            String upper = token.toUpperCase(Locale.ROOT);
            if (!WEEK_DAY.matcher(upper).matches()) continue;
            daysOfWeek.add(toDayOfWeek(upper));
        }

        if (daysOfWeek.isEmpty()) {
            return null;
        }

        LocalDate cursor = from.toLocalDate();

        for (int i = 0; i < 366 * 2; i++) { //최대 2년치 탐색 (충분히 넉넉)
            if (endDate != null && cursor.isAfter(endDate)) {
                return null;
            }

            DayOfWeek dow = cursor.getDayOfWeek();
            if (!daysOfWeek.contains(dow)) {
                cursor = cursor.plusDays(1);
                continue;
            }

            long weeksBetween = ChronoUnit.WEEKS.between(baseDate, cursor);
            if (weeksBetween < 0) {
                cursor = cursor.plusDays(1);
                continue;
            }

            if (weeksBetween % interval == 0) { //interval 주 간격 만족
                LocalDateTime candidate = LocalDateTime.of(cursor, startTime);
                if (!candidate.isBefore(from)) {
                    return candidate;
                }
            }

            cursor = cursor.plusDays(1);
        }

        return null;
    }

    private static DayOfWeek toDayOfWeek(String code) { // 수정: "MON" -> DayOfWeek.MONDAY
        return switch (code) {
            case "MON" -> DayOfWeek.MONDAY;
            case "TUE" -> DayOfWeek.TUESDAY;
            case "WED" -> DayOfWeek.WEDNESDAY;
            case "THU" -> DayOfWeek.THURSDAY;
            case "FRI" -> DayOfWeek.FRIDAY;
            case "SAT" -> DayOfWeek.SATURDAY;
            case "SUN" -> DayOfWeek.SUNDAY;
            default -> throw new IllegalArgumentException("Unknown week day code: " + code);
        };
    }

    private enum MonthRuleType { DAY, NTH, LAST } // 새로 추가

    private record MonthRule(MonthRuleType type, Integer dayOfMonth, Integer nth, DayOfWeek dow) { } // 새로 추가

    private static final Pattern MONTH_DAY = Pattern.compile("^D([1-9]|[12][0-9]|3[01])$"); //D1 ~ D31
    private static final Pattern MONTH_NTH = Pattern.compile("^([1-4])(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //4WED 4번째 주 수요일
    private static final Pattern MONTH_LAST = Pattern.compile("^LAST(MON|TUE|WED|THU|FRI|SAT|SUN)$"); //LASTWED 마지막 주 수요일


    public static LocalDateTime findNextMonthly( // 새로 추가
                                                  LocalDate baseDate,
                                                  LocalTime startTime,
                                                  int interval,
                                                  List<String> on,
                                                  LocalDate endDate,
                                                  LocalDateTime from
    ) {
        if (on == null || on.isEmpty()) {
            return null;
        }

        //on 에 들어있는 Dn / NTH / LAST 토큰을 MonthRule 로 파싱
        List<MonthRule> rules = parseMonthRules(on);
        if (rules.isEmpty()) {
            return null;
        }

        LocalDate fromDate = from.toLocalDate(); // 새로 추가
        YearMonth baseYm = YearMonth.from(baseDate);
        YearMonth fromYm = YearMonth.from(fromDate);

        long monthsDiff = ChronoUnit.MONTHS.between(baseYm, fromYm); // 새로 추가
        long step;
        if (monthsDiff <= 0) {
            step = 0;
        } else {
            step = ((monthsDiff + interval - 1) / interval) * interval; // interval 배수로 ceil // 새로 추가
        }

        YearMonth ym = baseYm.plusMonths(step); // 새로 추가

        while (true) { // 새로 추가
            LocalDate lastDayOfMonth = ym.atEndOfMonth();

            if (endDate != null && lastDayOfMonth.isAfter(endDate)) {
                return null;
            }

            LocalDateTime best = null;

            for (MonthRule rule : rules) {
                LocalDateTime candidate = switch (rule.type()) {
                    case DAY  -> candidateForDayOfMonth(ym, startTime, rule.dayOfMonth());
                    case NTH  -> candidateForNthWeekday(ym, startTime, rule.nth(), rule.dow());
                    case LAST -> candidateForLastWeekday(ym, startTime, rule.dow());
                };

                if (candidate == null) continue;
                if (candidate.isBefore(from)) continue;

                if (best == null || candidate.isBefore(best)) {
                    best = candidate;
                }
            }

            if (best != null) {
                return best;
            }

            ym = ym.plusMonths(interval); // 새로 추가
        }
    }

    private static List<MonthRule> parseMonthRules(List<String> on) { // 새로 추가
        List<MonthRule> result = new ArrayList<>();
        for (String token : on) {
            if (token == null) continue;
            String upper = token.toUpperCase(Locale.ROOT).replace(" ", "");

            Matcher mDay = MONTH_DAY.matcher(upper);
            if (mDay.matches()) {
                int day = Integer.parseInt(mDay.group(1));
                result.add(new MonthRule(MonthRuleType.DAY, day, null, null));
                continue;
            }

            Matcher mNth = MONTH_NTH.matcher(upper);
            if (mNth.matches()) {
                int nth = Integer.parseInt(mNth.group(1));    // 1~4
                DayOfWeek dow = toDayOfWeek(mNth.group(2));   // MON~SUN
                result.add(new MonthRule(MonthRuleType.NTH, null, nth, dow));
                continue;
            }

            Matcher mLast = MONTH_LAST.matcher(upper);
            if (mLast.matches()) {
                DayOfWeek dow = toDayOfWeek(mLast.group(1));
                result.add(new MonthRule(MonthRuleType.LAST, null, null, dow));
            }
        }
        return result;
    }

    private static LocalDateTime candidateForDayOfMonth( // 새로 추가
                                                         YearMonth ym,
                                                         LocalTime startTime,
                                                         Integer dayOfMonth
    ) {
        if (dayOfMonth == null) return null;
        int lastDay = ym.lengthOfMonth();
        if (dayOfMonth < 1 || dayOfMonth > lastDay) {
            return null;
        }
        LocalDate date = ym.atDay(dayOfMonth);
        return LocalDateTime.of(date, startTime);
    }

    private static LocalDateTime candidateForNthWeekday( // 새로 추가
                                                         YearMonth ym,
                                                         LocalTime startTime,
                                                         Integer nth,
                                                         DayOfWeek dow
    ) {
        if (nth == null || dow == null) return null;

        LocalDate first = ym.atDay(1);
        int diff = (dow.getValue() - first.getDayOfWeek().getValue() + 7) % 7;
        LocalDate date = first.plusDays(diff + 7L * (nth - 1));

        if (!YearMonth.from(date).equals(ym)) {
            return null;
        }

        return LocalDateTime.of(date, startTime);
    }

    private static LocalDateTime candidateForLastWeekday( // 새로 추가
                                                          YearMonth ym,
                                                          LocalTime startTime,
                                                          DayOfWeek dow
    ) {
        if (dow == null) return null;

        LocalDate last = ym.atEndOfMonth();
        int diff = (last.getDayOfWeek().getValue() - dow.getValue() + 7) % 7;
        LocalDate date = last.minusDays(diff);

        return LocalDateTime.of(date, startTime);
    }
}
