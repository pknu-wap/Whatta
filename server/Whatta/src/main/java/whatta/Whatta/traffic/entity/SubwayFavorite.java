package whatta.Whatta.traffic.entity;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("subway_items")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class SubwayFavorite {

    @Id
    private String id;

    @NotNull
    private String userId;

    @NotNull
    private String subwayStationId;

    @NotNull
    private String subwayStationName;

    @NotNull
    private String subwayRouteName;

    @NotNull
    private String upDownTypeCode;
}
