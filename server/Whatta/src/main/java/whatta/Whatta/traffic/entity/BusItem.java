package whatta.Whatta.traffic.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("bus_items")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class BusItem {

    @Id
    private String id;
    @NotNull
    private String userId;
    @NotNull
    private String busStationId;
    @NotNull
    private String busStationName;
    @NotNull
    private String busRouteId;
    @NotNull
    private String busRouteNo;
}
