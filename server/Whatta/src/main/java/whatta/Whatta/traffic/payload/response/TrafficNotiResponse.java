package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.entity.TrafficNotification;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Builder
public record TrafficNotiResponse(
        String id,
        LocalTime alarmTime,
        Set<DayOfWeek> days,
        List<String> targetItemIds,
        boolean isEnabled,
        boolean isRepeatEnabled
) {
    public static TrafficNotiResponse fromEntity(TrafficNotification alarm) {
        return TrafficNotiResponse.builder()
                .id(alarm.getId())
                .alarmTime(alarm.getAlarmTime())
                .days(alarm.getDays())
                .targetItemIds(alarm.getTargetItemIds())
                .isEnabled(alarm.isEnabled())
                .isRepeatEnabled(alarm.isRepeatEnabled())
                .build();
    }
}
