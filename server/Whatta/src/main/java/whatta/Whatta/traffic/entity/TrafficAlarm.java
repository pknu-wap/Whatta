package whatta.Whatta.traffic.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Document("traffic_alarms")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class TrafficAlarm {

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotNull
    private LocalTime alarmTime;

    @Builder.Default
    private Set<DayOfWeek> days = new HashSet<>();

    @Builder.Default
    private List<String> targetItemIds = new ArrayList<>();

    @Builder.Default
    private boolean isEnabled = true;

}
