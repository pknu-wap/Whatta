package whatta.Whatta.traffic.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document("traffic_groups")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class TrafficGroup {

    @Id
    private String id;

    @NotNull
    private String userid;

    private String groupName;

    private String busStationId;

    private String busStationName;

    @Builder.Default
    private List<String> targetRouteIds = new ArrayList<>();

}
