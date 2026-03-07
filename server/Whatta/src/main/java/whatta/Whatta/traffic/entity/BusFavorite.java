package whatta.Whatta.traffic.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("bus_items")
@CompoundIndexes({
        @CompoundIndex(
                name = "uniq_user_station_route",
                def = "{'userId': 1, 'busStationId': 1, 'busRouteId': 1}",
                unique = true
        )
})
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class BusFavorite {

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
