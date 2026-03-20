package whatta.Whatta.agent.service.extractor;

import org.springframework.stereotype.Component;
import whatta.Whatta.agent.payload.dto.RuleBasedExtractionResult;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RuleBasedExtractor {

    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("\\b(\\d{4})-(\\d{2})-(\\d{2})\\b");
    private static final Pattern KOREAN_MONTH_DAY_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일(?!\\d)");
    private static final Pattern SLASH_MONTH_DAY_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,2})/(\\d{1,2})(?!\\d)");
    private static final Pattern DAY_ONLY_PATTERN = Pattern.compile("(?<![\\d월/])([1-9]|[12]\\d|3[01])\\s*일(?!\\s*뒤)(?!\\d)");
    private static final Pattern RELATIVE_WEEK_PATTERN = Pattern.compile("(?<![가-힣A-Za-z0-9])(?:(일주일)|([1-9]\\d*)\\s*주(?:일)?)\\s*뒤(?:에)?");
    private static final Pattern RELATIVE_DAY_PATTERN = Pattern.compile("(?<![가-힣A-Za-z0-9])(?:(하루|이틀|사흘)|([1-9]\\d*)\\s*일)\\s*뒤(?:에)?");
    private static final Pattern WEEKDAY_PATTERN = Pattern.compile("(?<![가-힣A-Za-z0-9])(이번주|다음주)?\\s*(월|화|수|목|금|토|일)(?:요일)?(?:에)?(?=\\s|$|까지|전까지)");
    private static final Pattern DEADLINE_PATTERN = Pattern.compile("(오늘|내일|모레|(?<![가-힣A-Za-z0-9])(이번주|다음주)?\\s*(월|화|수|목|금|토|일)(?:요일)?)(까지|전까지)");
    private static final Pattern MERIDIEM_TIME_PATTERN = Pattern.compile("(오전|오후)\\s*(\\d{1,2})(?:시)?(?:\\s*(\\d{1,2})분)?(?:에)?");
    private static final Pattern CLOCK_TIME_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,2}):(\\d{2})(?:에)?(?!\\d)");
    private static final Pattern HOUR_TIME_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,2})\\s*시(?:\\s*(\\d{1,2})분)?(?:에)?");
    private static final Pattern LIST_ITEM_PATTERN = Pattern.compile("^\\s*(?:[-*•]|\\d+[.)])\\s+");
    private static final Pattern EDGE_PARTICLE_PATTERN = Pattern.compile("^(에|에게|을|를|은|는|이|가|와|과|도|만|로|으로)\\s+|\\s+(에|에게|을|를|은|는|이|가|와|과|도|만|로|으로)$");
    private static final Pattern COMMAND_SUFFIX_PATTERN = Pattern.compile("\\s*(추가|생성|등록|저장|만들기|만들어줘|넣어줘|넣기|작성해줘|추가해줘)$");
    private final Clock clock;

    public RuleBasedExtractor() {
        this(Clock.system(ScheduleExtractionSpec.KST_ZONE_ID));
    }

    public RuleBasedExtractor(Clock clock) {
        this.clock = clock;
    }

    public RuleBasedExtractionResult extract(String originalText, String normalizedText) {
        LocalDate referenceDate = LocalDate.now(clock);
        List<LocalDate> dateCandidates = new ArrayList<>();
        List<LocalTime> timeCandidates = new ArrayList<>();
        Map<String, List<String>> warnings = new LinkedHashMap<>();

        LocalDate deadlineCandidate = extractDeadline(normalizedText, referenceDate, warnings);
        dateCandidates.addAll(extractDates(normalizedText, referenceDate, warnings));

        timeCandidates.addAll(extractTimes(normalizedText, warnings));

        return RuleBasedExtractionResult.builder()
                .originalText(originalText)
                .normalizedText(normalizedText)
                .referenceDate(referenceDate)
                .dateCandidates(dateCandidates)
                .timeCandidates(timeCandidates)
                .deadlineCandidate(deadlineCandidate)
                .hasRepeatExpression(hasRepeatExpression(normalizedText))
                .titleHint(extractTitleHint(normalizedText))
                .warnings(warnings)
                .ambiguousDate(hasAmbiguousDate(normalizedText))
                .ambiguousTime(hasAmbiguousTime(normalizedText))
                .hasMultipleItems(hasMultipleItems(normalizedText, dateCandidates, timeCandidates))
                .build();
    }

    private List<LocalDate> extractDates(String text, LocalDate referenceDate, Map<String, List<String>> warnings) {
        List<LocalDate> dates = new ArrayList<>();

        Matcher isoMatcher = ISO_DATE_PATTERN.matcher(text);
        while (isoMatcher.find()) {
            tryAddDate(
                    dates,
                    Integer.parseInt(isoMatcher.group(1)),
                    Integer.parseInt(isoMatcher.group(2)),
                    Integer.parseInt(isoMatcher.group(3)),
                    isoMatcher.group(),
                    warnings
            );
        }

        Matcher koreanMonthDayMatcher = KOREAN_MONTH_DAY_PATTERN.matcher(text);
        while (koreanMonthDayMatcher.find()) {
            tryAddMonthDayDate(
                    dates,
                    Integer.parseInt(koreanMonthDayMatcher.group(1)),
                    Integer.parseInt(koreanMonthDayMatcher.group(2)),
                    referenceDate,
                    koreanMonthDayMatcher.group(),
                    warnings
            );
        }

        Matcher slashMonthDayMatcher = SLASH_MONTH_DAY_PATTERN.matcher(text);
        while (slashMonthDayMatcher.find()) {
            tryAddMonthDayDate(
                    dates,
                    Integer.parseInt(slashMonthDayMatcher.group(1)),
                    Integer.parseInt(slashMonthDayMatcher.group(2)),
                    referenceDate,
                    slashMonthDayMatcher.group(),
                    warnings
            );
        }

        Matcher dayOnlyMatcher = DAY_ONLY_PATTERN.matcher(text);
        while (dayOnlyMatcher.find()) {
            if (isPartOfMonthDayExpression(text, dayOnlyMatcher.start())) {
                continue;
            }
            tryAddDayOnlyDate(
                    dates,
                    Integer.parseInt(dayOnlyMatcher.group(1)),
                    referenceDate,
                    dayOnlyMatcher.group(),
                    warnings
            );
        }

        Matcher relativeWeekMatcher = RELATIVE_WEEK_PATTERN.matcher(text);
        while (relativeWeekMatcher.find()) {
            dates.add(referenceDate.plusWeeks(parseRelativeWeekOffset(relativeWeekMatcher)));
        }

        Matcher relativeDayMatcher = RELATIVE_DAY_PATTERN.matcher(text);
        while (relativeDayMatcher.find()) {
            dates.add(referenceDate.plusDays(parseRelativeDayOffset(relativeDayMatcher)));
        }

        if (text.contains("오늘")) {
            dates.add(referenceDate);
        }
        if (text.contains("내일")) {
            dates.add(referenceDate.plusDays(1));
        }
        if (text.contains("모레")) {
            dates.add(referenceDate.plusDays(2));
        }

        Matcher weekdayMatcher = WEEKDAY_PATTERN.matcher(text);
        while (weekdayMatcher.find()) {
            dates.add(resolveWeekdayDate(weekdayMatcher.group(1), weekdayMatcher.group(2), referenceDate));
        }

        return dates.stream().distinct().toList();
    }

    private LocalDate extractDeadline(String text, LocalDate referenceDate, Map<String, List<String>> warnings) {
        int markerIndex = findDeadlineMarkerIndex(text);
        if (markerIndex < 0) {
            return null;
        }

        String prefix = text.substring(0, markerIndex).trim();
        List<LocalDate> deadlineDates = extractDates(prefix, referenceDate, warnings);
        if (!deadlineDates.isEmpty()) {
            return deadlineDates.get(deadlineDates.size() - 1);
        }

        if (hasWarning(warnings, "startDate")) {
            return null;
        }

        return extractTimes(prefix, warnings).isEmpty() ? null : referenceDate;
    }

    private List<LocalTime> extractTimes(String text, Map<String, List<String>> warnings) {
        List<LocalTime> times = new ArrayList<>();

        Matcher meridiemMatcher = MERIDIEM_TIME_PATTERN.matcher(text);
        while (meridiemMatcher.find()) {
            int hour = Integer.parseInt(meridiemMatcher.group(2));
            int minute = meridiemMatcher.group(3) == null ? 0 : Integer.parseInt(meridiemMatcher.group(3));
            if ("오후".equals(meridiemMatcher.group(1)) && hour < 12) {
                hour += 12;
            }
            if ("오전".equals(meridiemMatcher.group(1)) && hour == 12) {
                hour = 0;
            }
            tryAddTime(times, hour, minute, meridiemMatcher.group(), warnings);
        }
        if (!times.isEmpty()) {
            return times.stream().distinct().toList();
        }

        Matcher clockMatcher = CLOCK_TIME_PATTERN.matcher(text);
        while (clockMatcher.find()) {
            tryAddTime(
                    times,
                    Integer.parseInt(clockMatcher.group(1)),
                    Integer.parseInt(clockMatcher.group(2)),
                    clockMatcher.group(),
                    warnings
            );
        }
        if (!times.isEmpty()) {
            return times.stream().distinct().toList();
        }

        Matcher hourMatcher = HOUR_TIME_PATTERN.matcher(text);
        while (hourMatcher.find()) {
            int hour = Integer.parseInt(hourMatcher.group(1));
            int minute = hourMatcher.group(2) == null ? 0 : Integer.parseInt(hourMatcher.group(2));
            tryAddTime(times, hour, minute, hourMatcher.group(), warnings);
        }

        return times.stream().distinct().toList();
    }

    private boolean hasRepeatExpression(String text) {
        return text.contains("매일")
                || text.contains("매주")
                || text.contains("매달")
                || text.contains("마다")
                || text.contains("격주")
                || text.contains("반복");
    }

    private boolean hasAmbiguousDate(String text) {
        return text.contains("주말")
                || text.contains("평일")
                || text.contains("이번주 중")
                || text.contains("다음주 중")
                || text.contains("언젠가");
    }

    private boolean hasAmbiguousTime(String text) {
        return text.contains("저녁")
                || text.contains("아침")
                || text.contains("점심")
                || text.contains("밤")
                || text.contains("쯤")
                || text.contains("전후")
                || text.contains("이후");
    }

    private boolean hasMultipleItems(String text, List<LocalDate> dateCandidates, List<LocalTime> timeCandidates) {
        if (text.contains(",") || text.contains(" 그리고 ") || text.contains(" 및 ")) {
            return true;
        }
        if (looksLikeMultiLineList(text)) {
            return true;
        }
        return dateCandidates.size() > 1 || timeCandidates.size() > 1;
    }

    private boolean looksLikeMultiLineList(String text) {
        if (!text.contains("\n")) {
            return false;
        }

        List<String> nonBlankLines = text.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .toList();

        if (nonBlankLines.size() < 2) {
            return false;
        }

        long listedLineCount = nonBlankLines.stream()
                .filter(this::hasListMarker)
                .count();
        if (listedLineCount >= 2) {
            return true;
        }

        long standaloneScheduleLineCount = nonBlankLines.stream()
                .map(this::stripListMarker)
                .filter(this::looksLikeStandaloneScheduleLine)
                .count();

        return standaloneScheduleLineCount >= 2;
    }

    private boolean looksLikeStandaloneScheduleLine(String line) {
        return hasScheduleSignal(line) && !extractTitleHint(line).isBlank();
    }

    private boolean hasScheduleSignal(String line) {
        return line.contains("오늘")
                || line.contains("내일")
                || line.contains("모레")
                || RELATIVE_WEEK_PATTERN.matcher(line).find()
                || RELATIVE_DAY_PATTERN.matcher(line).find()
                || DEADLINE_PATTERN.matcher(line).find()
                || WEEKDAY_PATTERN.matcher(line).find()
                || ISO_DATE_PATTERN.matcher(line).find()
                || KOREAN_MONTH_DAY_PATTERN.matcher(line).find()
                || SLASH_MONTH_DAY_PATTERN.matcher(line).find()
                || MERIDIEM_TIME_PATTERN.matcher(line).find()
                || CLOCK_TIME_PATTERN.matcher(line).find()
                || HOUR_TIME_PATTERN.matcher(line).find();
    }

    private boolean hasListMarker(String line) {
        return LIST_ITEM_PATTERN.matcher(line).find();
    }

    private String stripListMarker(String line) {
        return LIST_ITEM_PATTERN.matcher(line).replaceFirst("").trim();
    }

    private String extractTitleHint(String text) {
        String title = text;
        title = DEADLINE_PATTERN.matcher(title).replaceAll(" ");
        title = WEEKDAY_PATTERN.matcher(title).replaceAll(" ");
        title = ISO_DATE_PATTERN.matcher(title).replaceAll(" ");
        title = KOREAN_MONTH_DAY_PATTERN.matcher(title).replaceAll(" ");
        title = SLASH_MONTH_DAY_PATTERN.matcher(title).replaceAll(" ");
        title = RELATIVE_WEEK_PATTERN.matcher(title).replaceAll(" ");
        title = RELATIVE_DAY_PATTERN.matcher(title).replaceAll(" ");
        title = title.replace("오늘", " ")
                .replace("내일", " ")
                .replace("모레", " ")
                .replace("다음주", " ")
                .replace("이번주", " ")
                .replace("매주", " ")
                .replace("매일", " ")
                .replace("전까지", " ")
                .replace("까지", " ");
        title = title.replaceAll("(오전|오후)\\s*$", " ");
        title = MERIDIEM_TIME_PATTERN.matcher(title).replaceAll(" ");
        title = CLOCK_TIME_PATTERN.matcher(title).replaceAll(" ");
        title = HOUR_TIME_PATTERN.matcher(title).replaceAll(" ");
        return sanitizeTitleHint(title);
    }

    private String sanitizeTitleHint(String title) {
        String sanitized = title
                .replace("\"", " ")
                .replace("'", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String previous;
        do {
            previous = sanitized;
            sanitized = EDGE_PARTICLE_PATTERN.matcher(sanitized).replaceAll("").trim();
            sanitized = COMMAND_SUFFIX_PATTERN.matcher(sanitized).replaceAll("").trim();
        } while (!sanitized.equals(previous));

        return sanitized;
    }

    private void tryAddDate(List<LocalDate> dates, int year, int month, int day, String token, Map<String, List<String>> warnings) {
        try {
            dates.add(LocalDate.of(year, month, day));
        } catch (DateTimeException e) {
            addWarning(warnings, "startDate", token);
        }
    }

    private void tryAddMonthDayDate(List<LocalDate> dates, int month, int day, LocalDate referenceDate, String token, Map<String, List<String>> warnings) {
        try {
            dates.add(resolveMonthDayDate(month, day, referenceDate));
        } catch (DateTimeException e) {
            addWarning(warnings, "startDate", token);
        }
    }

    private void tryAddDayOnlyDate(List<LocalDate> dates, int day, LocalDate referenceDate, String token, Map<String, List<String>> warnings) {
        try {
            dates.add(resolveDayOnlyDate(day, referenceDate));
        } catch (DateTimeException e) {
            addWarning(warnings, "startDate", token);
        }
    }

    private boolean isPartOfMonthDayExpression(String text, int dayTokenStartIndex) {
        String prefix = text.substring(0, dayTokenStartIndex);
        return prefix.matches(".*\\d{1,2}\\s*월\\s*$");
    }

    private void tryAddTime(List<LocalTime> times, int hour, int minute, String token, Map<String, List<String>> warnings) {
        try {
            times.add(LocalTime.of(hour, minute));
        } catch (DateTimeException e) {
            addWarning(warnings, "startTime", token);
        }
    }

    private void addWarning(Map<String, List<String>> warnings, String fieldName, String rawValue) {
        List<String> values = warnings.computeIfAbsent(fieldName, ignored -> new ArrayList<>());
        if (!values.contains(rawValue)) {
            values.add(rawValue);
        }
    }

    private int warningCount(Map<String, List<String>> warnings, String fieldName) {
        if (warnings == null) {
            return 0;
        }
        List<String> values = warnings.get(fieldName);
        return values == null ? 0 : values.size();
    }

    private boolean hasWarning(Map<String, List<String>> warnings, String fieldName) {
        return warningCount(warnings, fieldName) > 0;
    }

    private long parseRelativeWeekOffset(Matcher matcher) {
        if (matcher.group(1) != null) {
            return 1;
        }
        return Long.parseLong(matcher.group(2));
    }

    private long parseRelativeDayOffset(Matcher matcher) {
        if (matcher.group(1) == null) {
            return Long.parseLong(matcher.group(2));
        }

        return switch (matcher.group(1)) {
            case "하루" -> 1;
            case "이틀" -> 2;
            case "사흘" -> 3;
            case "나흘" -> 4;
            default -> throw new IllegalArgumentException("Unsupported relative day token: " + matcher.group(1));
        };
    }

    private LocalDate resolveMonthDayDate(int month, int day, LocalDate referenceDate) {
        LocalDate candidate = LocalDate.of(referenceDate.getYear(), month, day);
        if (candidate.isBefore(referenceDate)) {
            return candidate.plusYears(1);
        }
        return candidate;
    }

    private LocalDate resolveDayOnlyDate(int day, LocalDate referenceDate) {
        LocalDate candidate = LocalDate.of(referenceDate.getYear(), referenceDate.getMonth(), day);
        if (candidate.isBefore(referenceDate)) {
            return candidate.plusMonths(1);
        }
        return candidate;
    }

    private int findDeadlineMarkerIndex(String text) {
        int beforeIndex = text.indexOf("전까지");
        if (beforeIndex >= 0) {
            return beforeIndex;
        }
        return text.indexOf("까지");
    }

    private LocalDate resolveWeekdayDate(String weekModifier, String dayKor, LocalDate referenceDate) {
        DayOfWeek dayOfWeek = toDayOfWeek(dayKor);
        if (weekModifier == null || weekModifier.isBlank()) {
            return referenceDate.with(TemporalAdjusters.nextOrSame(dayOfWeek));
        }

        LocalDate weekStart = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        if ("다음주".equals(weekModifier)) {
            weekStart = weekStart.plusWeeks(1);
        }

        return weekStart.with(TemporalAdjusters.nextOrSame(dayOfWeek));
    }

    private DayOfWeek toDayOfWeek(String dayKor) {
        return switch (dayKor) {
            case "월" -> DayOfWeek.MONDAY;
            case "화" -> DayOfWeek.TUESDAY;
            case "수" -> DayOfWeek.WEDNESDAY;
            case "목" -> DayOfWeek.THURSDAY;
            case "금" -> DayOfWeek.FRIDAY;
            case "토" -> DayOfWeek.SATURDAY;
            case "일" -> DayOfWeek.SUNDAY;
            default -> throw new IllegalArgumentException("Unsupported weekday: " + dayKor);
        };
    }

}
