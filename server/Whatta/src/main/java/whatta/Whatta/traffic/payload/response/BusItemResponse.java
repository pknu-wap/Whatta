package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.entity.BusItem;

@Builder
public record BusItemResponse(
        String id,
        String busStationId,
        String busStationName,
        String busRouteId,
        String busRouteNo
) {
    public static BusItemResponse fromEntity(BusItem item) {
        return BusItemResponse.builder()
                .id(item.getId())
                .busStationId(item.getBusStationId())
                .busStationName(item.getBusStationName())
                .busRouteId(item.getBusRouteId())
                .busRouteNo(item.getBusRouteNo())
                .build();
    }
}
