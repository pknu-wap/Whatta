package whatta.Whatta.traffic.payload.request;

import lombok.Getter;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Getter
public class TrafficAlarmUpdateRequest {
    private LocalTime alarmTime;
    private Set<DayOfWeek> days;
    private List<String> targetItemIds;
    private Boolean isEnabled;
    private Boolean isRepeatEnabled;

}
