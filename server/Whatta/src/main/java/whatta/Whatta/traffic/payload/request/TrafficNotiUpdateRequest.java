package whatta.Whatta.traffic.payload.request;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;


public record TrafficNotiUpdateRequest(
    LocalTime alarmTime,
    Set<DayOfWeek> days,
    List<String> targetItemIds,
    Boolean isEnabled
) {}