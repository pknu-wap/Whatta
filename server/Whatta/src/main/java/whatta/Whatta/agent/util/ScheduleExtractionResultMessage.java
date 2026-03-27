package whatta.Whatta.agent.util;

import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import java.util.List;
import java.util.Map;

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
        String warningDetail = buildWarningDetail(schedules);
        if (warningDetail == null) {
            return appendPartialFailureMessage("스케줄 생성을 완료했어요. 다만 일부 정보가 불분명해 현재 기준으로 정리했어요.", hasUnscheduledItems);
        }

        return appendPartialFailureMessage("스케줄 생성을 완료했어요. 다만 " + warningDetail, hasUnscheduledItems);
    }

    private static String buildWarningDetail(List<NormalizedSchedule> schedules) {
        boolean hasDateWarning = hasWarning(schedules, "startDate");
        boolean hasTimeWarning = hasWarning(schedules, "startTime");

        if (!hasDateWarning && !hasTimeWarning) {
            return null;
        }

        if (hasDateWarning && hasTimeWarning) {
            return "날짜와 시간을 이해하지 못했어요.";
        }

        if (hasDateWarning) {
            return "날짜를 이해하지 못했어요.";
        }

        return "시간을 이해하지 못했어요.";
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
}
