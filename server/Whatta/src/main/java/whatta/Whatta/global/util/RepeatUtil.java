package whatta.Whatta.global.util;

import whatta.Whatta.event.entity.Repeat;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;

import static whatta.Whatta.global.util.RepeatRulePatterns.*;

/**
 * Repeat 은 엔티티 생성 시점에 유효성 검증이 완료된 상태를 전제로 한다.
 * 본 유틸은 반복 전개 로직만 담당하며, 여기서 발생하는 예외는 데이터 무결성 위반을 의미한다.
 */
public class RepeatUtil {

    private static final int MAX_WEEK_SEARCH_DAYS = 366 * 2;

    //strictly after
    public static LocalDateTime findNextOccurrenceStartAfter(LocalDateTime rootStartAt, Repeat repeat, LocalDateTime from) {
        if (repeat == null) return null;

        LocalDateTime cursor = from;

        int safeGuard = 0;
        while (safeGuard++ < 1000) {

            LocalDateTime candidate =  switch (repeat.getUnit()) {
                case DAY -> findNextDaily(rootStartAt, repeat, cursor);
                case WEEK -> findNextWeekly(rootStartAt, repeat, cursor);
                case MONTH -> findNextMonthly(rootStartAt, repeat, cursor);
            };

            if (candidate == null ) return null;

            if (repeat.getExceptionDates() != null && repeat.getExceptionDates().contains(candidate.toLocalDate())) {
                cursor = candidate.plusSeconds(1);
                continue;
            }
            return candidate;
        }
        return null;
    }

    public static LocalDateTime findNextDaily(LocalDateTime rootStartAt, Repeat repeat, LocalDateTime from) {
        LocalDate baseDate = rootStartAt.toLocalDate();
        LocalTime baseTime = rootStartAt.toLocalTime();

        int interval = repeat.getInterval();
        LocalDate deadline = repeat.getDeadline();

        if (from.isBefore(rootStartAt)) {
            if (deadline != null && baseDate.isAfter(deadline)) {
                return null;
            }
            return rootStartAt;
        }

        /* 반복 조건에 맞는 가장 가까운 후보 날짜를 찾음 */
        long daysDiff = ChronoUnit.DAYS.between(rootStartAt.toLocalDate(), from.toLocalDate());
        long step = (daysDiff / interval) * interval;

        LocalDate candidateDate = baseDate.plusDays(step);
        LocalDateTime candidateAt = LocalDateTime.of(candidateDate, baseTime);

        while (!candidateAt.isAfter(from)) {
            candidateDate = candidateDate.plusDays(interval);
            candidateAt = LocalDateTime.of(candidateDate, baseTime);
        }

        if (deadline != null && candidateDate.isAfter(deadline)) {
            return null;
        }

        return candidateAt;
    }

    public static LocalDateTime findNextWeekly(LocalDateTime rootStartAt, Repeat repeat, LocalDateTime from) {
        LocalDate baseDate = rootStartAt.toLocalDate();
        LocalTime baseTime = rootStartAt.toLocalTime();

        int interval = repeat.getInterval();
        List<String> on = repeat.getOn();
        LocalDate deadline = repeat.getDeadline();

        List<DayOfWeek> daysOfWeek = parseWeekDays(on);
        if (daysOfWeek.isEmpty()) {
            throw new IllegalStateException("Weekly repeat requires at least one valid weekday (MON~SUN). Given: " + on);
        }

        LocalDate cursorDate = from.toLocalDate();
        LocalDate searchEndDate = calculateWeeklySearchEndDate(cursorDate, deadline);

        for (LocalDate d = cursorDate; !d.isAfter(searchEndDate); d = d.plusDays(1)) {
            if (deadline != null && d.isAfter(deadline)) {
                return null;
            }

            if (!daysOfWeek.contains(d.getDayOfWeek())) {
                continue;
            }

            long weeksBetween = ChronoUnit.WEEKS.between(baseDate, d);
            if (weeksBetween < 0) {
                continue;
            }

            if (weeksBetween % interval == 0) { //interval 주 간격 만족
                LocalDateTime candidate = LocalDateTime.of(d, baseTime);
                if (candidate.isAfter(from)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private static List<DayOfWeek> parseWeekDays(List<String> on) {
        List<DayOfWeek> result = new ArrayList<>();

        for (String token : on) {
            if (token == null) continue;
            String upper = normalizeToken(token);
            if (!WEEK_DAY.matcher(upper).matches()) continue;
            DayOfWeek dow = toDayOfWeek(upper);

            if (!result.contains(dow)) {
                result.add(dow);
            }
        }
        return result;
    }

    private static LocalDate calculateWeeklySearchEndDate(LocalDate cursorDate, LocalDate deadline) {
        if (deadline != null) {
            return deadline;
        }
        return cursorDate.plusDays(MAX_WEEK_SEARCH_DAYS);
    }

    private enum MonthRuleType { DAY, NTH, LAST, LAST_DAY }

    private record MonthRule(MonthRuleType type, Integer dayOfMonth, Integer nth, DayOfWeek dow) { }

    public static LocalDateTime findNextMonthly(LocalDateTime rootStartAt, Repeat repeat, LocalDateTime from) {
        LocalDate baseDate = rootStartAt.toLocalDate();
        LocalTime baseTime = rootStartAt.toLocalTime();

        int interval = repeat.getInterval();
        String on = repeat.getOn().get(0);
        LocalDate deadline = repeat.getDeadline();

        MonthRule rule = parseMonthRules(on);

        LocalDate fromDate = from.toLocalDate();
        YearMonth baseYm = YearMonth.from(baseDate);
        YearMonth fromYm = YearMonth.from(fromDate);

        long monthsDiff = ChronoUnit.MONTHS.between(baseYm, fromYm);
        long step = monthsDiff <= 0 ? 0 : ((monthsDiff + interval - 1) / interval) * interval; // interval 배수로 ceil
        YearMonth ym = baseYm.plusMonths(step);

        int safeGuard = 0;
        while (safeGuard++ < 1000) {
            if (deadline != null && ym.atDay(1).isAfter(deadline)) {
                return null;
            }

            LocalDateTime candidate = switch (rule.type()) {
                case DAY -> candidateForDayOfMonth(ym, baseTime, rule.dayOfMonth());
                case NTH -> candidateForNthWeekday(ym, baseTime, rule.nth(), rule.dow());
                case LAST -> candidateForLastWeekday(ym, baseTime, rule.dow());
                case LAST_DAY -> candidateForLastDayOfMonth(ym, baseTime);
            };

            if (candidate != null) {
                if (deadline != null && candidate.toLocalDate().isAfter(deadline)) {
                    return null;
                }
                if (candidate.isAfter(from)) {
                    return candidate;
                }
            }
            ym = ym.plusMonths(interval);
        }
        throw new IllegalStateException(
                "Monthly repeat expansion exceeded max steps. " +
                        "This usually indicates invalid MONTH rule or corrupted data. on=" + repeat.getOn());
    }

    private static MonthRule parseMonthRules(String on) {
        String token = normalizeToken(on);
        Matcher mDay = MONTH_DAY.matcher(token);
        if (mDay.matches()) {
            int day = Integer.parseInt(mDay.group(1));
            return new MonthRule(MonthRuleType.DAY, day, null, null);
        }

        Matcher mNth = MONTH_NTH.matcher(token);
        if (mNth.matches()) {
            int nth = Integer.parseInt(mNth.group(1)); //1~4
            DayOfWeek dow = toDayOfWeek(mNth.group(2)); //MON~SUN
            return new MonthRule(MonthRuleType.NTH, null, nth, dow);
        }

        Matcher mLast = MONTH_LAST.matcher(token);
        if (mLast.matches()) {
            DayOfWeek dow = toDayOfWeek(mLast.group(1)); //MON~SUN
            return new MonthRule(MonthRuleType.LAST, null, null, dow);
        }

        Matcher mLastDay = MONTH_LAST_DAY.matcher(token);
        if (mLastDay.matches()) {
            return new MonthRule(MonthRuleType.LAST_DAY, null, null, null);
        }

        throw new IllegalStateException("Invalid MONTH repeat rule token: " + on);
    }

    private static LocalDateTime candidateForDayOfMonth(YearMonth ym, LocalTime startTime, Integer dayOfMonth) {
        if (dayOfMonth == null) return null;
        int lastDay = ym.lengthOfMonth();
        if (dayOfMonth < 1 || dayOfMonth > lastDay) {
            return null;
        }

        LocalDate date = ym.atDay(dayOfMonth);
        return LocalDateTime.of(date, startTime);
    }

    private static LocalDateTime candidateForNthWeekday(YearMonth ym, LocalTime startTime, Integer nth, DayOfWeek dow) {
        if (nth == null || dow == null) return null;

        LocalDate first = ym.atDay(1);
        int diff = (dow.getValue() - first.getDayOfWeek().getValue() + 7) % 7;
        LocalDate date = first.plusDays(diff + 7L * (nth - 1));

        if (!YearMonth.from(date).equals(ym)) {
            return null;
        }

        return LocalDateTime.of(date, startTime);
    }

    private static LocalDateTime candidateForLastWeekday(YearMonth ym, LocalTime startTime, DayOfWeek dow) {
        if (dow == null) return null;

        LocalDate last = ym.atEndOfMonth();
        int diff = (last.getDayOfWeek().getValue() - dow.getValue() + 7) % 7;
        LocalDate date = last.minusDays(diff);

        return LocalDateTime.of(date, startTime);
    }

    private static LocalDateTime candidateForLastDayOfMonth(YearMonth ym, LocalTime startTime) {
        return LocalDateTime.of(ym.atEndOfMonth(), startTime);
    }
}
