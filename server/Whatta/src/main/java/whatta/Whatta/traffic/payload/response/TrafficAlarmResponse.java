package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.entity.TrafficAlarm;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Builder
public record TrafficAlarmResponse(
        String id,
        LocalTime alarmTime,
        Set<DayOfWeek> days,
        List<String> targetItemIds,
        boolean isEnabled,
        boolean isRepeatEnabled
) {
    public static TrafficAlarmResponse fromEntity(TrafficAlarm alarm) {
        return TrafficAlarmResponse.builder()
                .id(alarm.getId())
                .alarmTime(alarm.getAlarmTime())
                .days(alarm.getDays())
                .targetItemIds(alarm.getTargetItemIds())
                .isEnabled(alarm.isEnabled())
                .isRepeatEnabled(alarm.isRepeatEnabled())
                .build();
    }
}
