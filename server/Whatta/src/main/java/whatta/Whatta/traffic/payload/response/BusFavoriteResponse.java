package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.entity.BusFavorite;

@Builder
public record BusFavoriteResponse(
        String id,
        String busStationId,
        String busStationName,
        String busRouteId,
        String busRouteNo
) {
    public static BusFavoriteResponse fromEntity(BusFavorite item) {
        return BusFavoriteResponse.builder()
                .id(item.getId())
                .busStationId(item.getBusStationId())
                .busStationName(item.getBusStationName())
                .busRouteId(item.getBusRouteId())
                .busRouteNo(item.getBusRouteNo())
                .build();
    }
}
