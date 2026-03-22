package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.TrafficConstants;
import whatta.Whatta.traffic.entity.BusFavorite;

@Builder
public record BusFavoriteResponse(
        String id,
        String busStationId,
        String busStationName,
        String busRouteId,
        String busRouteNo,
        String cityCode
) {
    public static BusFavoriteResponse fromEntity(BusFavorite item) {
        return BusFavoriteResponse.builder()
                .id(item.getId())
                .busStationId(item.getBusStationId())
                .busStationName(item.getBusStationName())
                .busRouteId(item.getBusRouteId())
                .busRouteNo(item.getBusRouteNo())
                .cityCode(resolveCityCode(item.getCityCode()))
                .build();
    }

    private static String resolveCityCode(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) {
            return TrafficConstants.DEFAULT_CITY_CODE;
        }
        return cityCode.trim();
    }
}
