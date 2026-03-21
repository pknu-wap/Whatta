package whatta.Whatta.agent.util;

import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;
import whatta.Whatta.global.util.LocalDateTimeUtil;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public final class ScheduleExtractionResultMessage {

    private ScheduleExtractionResultMessage() {
    }

    public static String from(List<NormalizedSchedule> schedules) {
        if (schedules == null || schedules.isEmpty()) {
            return "스케줄을 생성할 수 있는 내용을 찾지 못했어요.";
        }

        long scheduledCount = schedules.stream()
                .filter(NormalizedSchedule::isScheduled)
                .count();
        boolean hasStartDateWarning = hasWarning(schedules, "startDate");
        boolean hasStartTimeWarning = hasWarning(schedules, "startTime");
        boolean hasAnyWarning = hasStartDateWarning || hasStartTimeWarning;
        boolean hasUnscheduledItems = scheduledCount < schedules.size();

        if (hasAnyWarning) {
            return buildAdjustedSuccessMessage(schedules, scheduledCount > 0 && hasUnscheduledItems);
        }

        if (scheduledCount == 0) {
            return "스케줄을 생성할 수 있는 내용을 찾지 못했어요.";
        }

        if (hasUnscheduledItems) {
            return "스케줄 생성을 완료했어요. 다만 일부 내용은 이해하지 못했어요.";
        }

        return "스케줄 생성을 완료했어요. 이대로 등록할까요?";
    }

    private static String buildAdjustedSuccessMessage(List<NormalizedSchedule> schedules, boolean hasUnscheduledItems) {
        List<String> details = new ArrayList<>();
        Set<String> seenDateWarnings = new HashSet<>();
        Set<String> seenTimeWarnings = new HashSet<>();

        for (NormalizedSchedule schedule : schedules) {
            if (schedule == null || schedule.warnings() == null || schedule.warnings().isEmpty()) {
                continue;
            }

            String warningDetail = buildWarningDetail(schedule, seenDateWarnings, seenTimeWarnings);
            if (warningDetail != null) {
                details.add(warningDetail);
            }
        }

        if (details.isEmpty()) {
            return appendPartialFailureMessage("스케줄 생성을 완료했어요. 다만 일부 정보가 불분명해 현재 기준으로 정리했어요.", hasUnscheduledItems);
        }

        return appendPartialFailureMessage("스케줄 생성을 완료했어요. 다만 " + joinWarningDetails(details), hasUnscheduledItems);
    }

    private static String buildWarningDetail(NormalizedSchedule schedule, Set<String> seenDateWarnings, Set<String> seenTimeWarnings) {
        List<String> rawDates = schedule.warnings().get("startDate");
        List<String> rawTimes = schedule.warnings().get("startTime");
        String rawDate = rawDates != null && !rawDates.isEmpty() ? rawDates.get(0) : null;
        String rawTime = rawTimes != null && !rawTimes.isEmpty() ? rawTimes.get(0) : null;
        boolean hasDateWarning = rawDate != null && seenDateWarnings.add(rawDate);
        boolean hasTimeWarning = rawTime != null && seenTimeWarnings.add(rawTime);

        if (!hasDateWarning && !hasTimeWarning) {
            return null;
        }

        if (hasDateWarning && hasTimeWarning) {
            return "\"" + rawDate + "\"" + chooseAndParticle(rawDate)
                    + " \"" + rawTime + "\"" + chooseTopicParticle(rawTime) + " 해석하지 못해서 "
                    + buildDateResolution(schedule) + " " + buildTimeResolution(schedule);
        }

        if (hasDateWarning) {
            return "\"" + rawDate + "\"" + chooseTopicParticle(rawDate) + " 해석하지 못해서 " + buildDateResolution(schedule);
        }

        return "\"" + rawTime + "\"" + chooseTopicParticle(rawTime) + " 해석하지 못해서 " + buildTimeResolution(schedule);
    }

    private static String buildDateResolution(NormalizedSchedule schedule) {
        LocalDate fallbackDate = schedule.startDate();
        if (fallbackDate == null) {
            return "날짜는 비워뒀어요.";
        }

        LocalDate today = LocalDate.now(ScheduleExtractionSpec.KST_ZONE_ID);
        if (Objects.equals(fallbackDate, today)) {
            return "일단 오늘 날짜(" + fallbackDate + ")로 넣었어요.";
        }

        return "일단 " + fallbackDate + "로 넣었어요.";
    }

    private static String buildTimeResolution(NormalizedSchedule schedule) {
        if (schedule.startTime() == null) {
            return "시간은 비워뒀어요.";
        }

        return "일단 " + LocalDateTimeUtil.localTimeToString(schedule.startTime()) + "로 넣었어요.";
    }

    private static String appendPartialFailureMessage(String baseMessage, boolean hasUnscheduledItems) {
        if (!hasUnscheduledItems) {
            return baseMessage;
        }
        return baseMessage + " 일부 내용은 이해하지 못했어요.";
    }

    private static boolean hasWarning(List<NormalizedSchedule> schedules, String key) {
        return schedules.stream()
                .map(NormalizedSchedule::warnings)
                .filter(map -> map != null && !map.isEmpty())
                .map(Map::keySet)
                .anyMatch(keys -> keys.contains(key));
    }

    private static String joinWarningDetails(List<String> details) {
        if (details == null || details.isEmpty()) {
            return "확인 후 수정해주세요.";
        }

        StringBuilder joined = new StringBuilder(details.get(0));
        for (int i = 1; i < details.size(); i++) {
            joined.append(" 그리고 ").append(details.get(i));
        }
        joined.append(" 확인 후 수정해주세요.");
        return joined.toString();
    }

    private static String chooseAndParticle(String value) {
        CodaType codaType = getCodaType(value);
        if (codaType == CodaType.HAS_BATCHIM) {
            return "과";
        }
        if (codaType == CodaType.NO_BATCHIM) {
            return "와";
        }
        return "과(와)";
    }

    private static String chooseTopicParticle(String value) {
        CodaType codaType = getCodaType(value);
        if (codaType == CodaType.HAS_BATCHIM) {
            return "은";
        }
        if (codaType == CodaType.NO_BATCHIM) {
            return "는";
        }
        return "는(은)";
    }

    private static CodaType getCodaType(String value) {
        if (value == null || value.isBlank()) {
            return CodaType.UNKNOWN;
        }

        char lastChar = value.charAt(value.length() - 1);
        if (lastChar < 0xAC00 || lastChar > 0xD7A3) {
            return CodaType.UNKNOWN;
        }

        return (lastChar - 0xAC00) % 28 != 0 ? CodaType.HAS_BATCHIM : CodaType.NO_BATCHIM;
    }

    private enum CodaType {
        HAS_BATCHIM,
        NO_BATCHIM,
        UNKNOWN
    }
}
