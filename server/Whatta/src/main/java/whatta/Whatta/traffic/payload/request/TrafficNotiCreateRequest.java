package whatta.Whatta.traffic.payload.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

public record TrafficNotiCreateRequest(
        @NotNull
        LocalTime alarmTime,

        Set<DayOfWeek> days,

        @NotNull
        @Size(min = 1, max = 6)
        List<String> targetItemIds
) {}
