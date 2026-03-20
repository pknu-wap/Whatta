package whatta.Whatta.agent.util;

import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.spec.ScheduleExtractionSpec;
import whatta.Whatta.global.util.LocalDateTimeUtil;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class ScheduleExtractionResultMessage {

    private ScheduleExtractionResultMessage() {
    }

    public static String from(List<NormalizedSchedule> schedules) {
        if (schedules == null || schedules.isEmpty()) {
            return "만들 수 있는 내용을 찾지 못했어요.";
        }

        long scheduledCount = schedules.stream()
                .filter(NormalizedSchedule::isScheduled)
                .count();
        long scheduledEventCount = schedules.stream()
                .filter(NormalizedSchedule::isScheduled)
                .filter(NormalizedSchedule::isEvent)
                .count();
        long scheduledTaskCount = schedules.stream()
                .filter(NormalizedSchedule::isScheduled)
                .filter(schedule -> !schedule.isEvent())
                .count();
        boolean hasStartDateWarning = hasWarning(schedules, "startDate");
        boolean hasStartTimeWarning = hasWarning(schedules, "startTime");
        boolean hasAnyWarning = hasStartDateWarning || hasStartTimeWarning;
        String createdTarget = buildCreatedTargetLabel(scheduledEventCount, scheduledTaskCount);

        if (scheduledCount > 0) {
            if (hasAnyWarning) {
                return buildAdjustedSuccessMessage(createdTarget, schedules);
            }
            if (scheduledCount == schedules.size()) {
                return createdTarget + " 만들었어요.";
            }
            return createdTarget + " 만들었어요. 다만 일부 내용은 이해하지 못했어요.";
        }

        if (hasStartDateWarning || hasStartTimeWarning) {
            return buildUnscheduledWarningMessage(schedules);
        }

        return "날짜, 시간, 마감 같은 핵심 정보를 충분히 찾지 못해서 만들지 못했어요.";
    }

    private static String buildAdjustedSuccessMessage(String createdTarget, List<NormalizedSchedule> schedules) {
        List<String> details = new ArrayList<>();

        for (NormalizedSchedule schedule : schedules) {
            if (schedule == null || !schedule.isScheduled() || schedule.warnings() == null || schedule.warnings().isEmpty()) {
                continue;
            }

            appendDateWarnings(details, schedule);
            appendTimeWarnings(details, schedule);
        }

        if (details.isEmpty()) {
            return createdTarget + " 만들었어요. 다만 일부 정보가 불분명해 현재 기준으로 정리했어요.";
        }

        return createdTarget + " 만들었어요. 다만 " + String.join(" ", details);
    }

    private static String buildCreatedTargetLabel(long scheduledEventCount, long scheduledTaskCount) {
        if (scheduledEventCount > 0 && scheduledTaskCount > 0) {
            return "일정 " + scheduledEventCount + "개와 할 일 " + scheduledTaskCount + "개를";
        }
        if (scheduledEventCount > 0) {
            return "일정 " + scheduledEventCount + "개를";
        }
        return "할 일 " + scheduledTaskCount + "개를";
    }

    private static void appendDateWarnings(List<String> details, NormalizedSchedule schedule) {
        List<String> rawDates = schedule.warnings().get("startDate");
        if (rawDates == null || rawDates.isEmpty()) {
            return;
        }

        String rawDate = rawDates.get(0);
        LocalDate fallbackDate = schedule.startDate();
        if (fallbackDate == null) {
            details.add("날짜가 \"" + rawDate + "\"로 들어와서 날짜는 비워뒀어요. 확인 후 수정해주세요.");
            return;
        }

        LocalDate today = LocalDate.now(ScheduleExtractionSpec.KST_ZONE_ID);
        if (Objects.equals(fallbackDate, today)) {
            details.add("날짜가 \"" + rawDate + "\"로 들어와서 일단 오늘 날짜(" + fallbackDate + ")로 넣었어요. 확인 후 수정해주세요.");
            return;
        }

        details.add("날짜가 \"" + rawDate + "\"로 들어와서 일단 " + fallbackDate + "로 넣었어요. 확인 후 수정해주세요.");
    }

    private static void appendTimeWarnings(List<String> details, NormalizedSchedule schedule) {
        List<String> rawTimes = schedule.warnings().get("startTime");
        if (rawTimes == null || rawTimes.isEmpty()) {
            return;
        }

        String rawTime = rawTimes.get(0);
        if (schedule.startTime() == null) {
            details.add("시간이 \"" + rawTime + "\"로 들어와서 시간은 비워뒀어요. 확인 후 수정해주세요.");
            return;
        }

        details.add("시간이 \"" + rawTime + "\"로 들어와서 일단 " + LocalDateTimeUtil.localTimeToString(schedule.startTime()) + "로 넣었어요. 확인 후 수정해주세요.");
    }

    private static String buildUnscheduledWarningMessage(List<NormalizedSchedule> schedules) {
        List<String> details = new ArrayList<>();

        for (NormalizedSchedule schedule : schedules) {
            if (schedule == null || schedule.warnings() == null || schedule.warnings().isEmpty()) {
                continue;
            }

            List<String> rawDates = schedule.warnings().get("startDate");
            if (rawDates != null && !rawDates.isEmpty()) {
                details.add("날짜가 \"" + rawDates.get(0) + "\"로 들어와서 이해하지 못해 일단 비워뒀어요. 확인 후 수정해주세요.");
            }

            List<String> rawTimes = schedule.warnings().get("startTime");
            if (rawTimes != null && !rawTimes.isEmpty()) {
                details.add("시간이 \"" + rawTimes.get(0) + "\"로 들어와서 이해하지 못해 일단 비워뒀어요. 확인 후 수정해주세요.");
            }
        }

        if (details.isEmpty()) {
            return "날짜나 시간을 정확히 이해하지 못해서 만들지 못했어요.";
        }

        return String.join(" ", details);
    }

    private static boolean hasWarning(List<NormalizedSchedule> schedules, String key) {
        return schedules.stream()
                .map(NormalizedSchedule::warnings)
                .filter(map -> map != null && !map.isEmpty())
                .map(Map::keySet)
                .anyMatch(keys -> keys.contains(key));
    }
}
