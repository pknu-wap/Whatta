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
    public static BusFavoriteResponse fromEntity(BusFavorite favorite) {
        return BusFavoriteResponse.builder()
                .id(favorite.getId())
                .busStationId(favorite.getBusStationId())
                .busStationName(favorite.getBusStationName())
                .busRouteId(favorite.getBusRouteId())
                .busRouteNo(favorite.getBusRouteNo())
                .cityCode(resolveCityCode(favorite.getCityCode()))
                .build();
    }

    private static String resolveCityCode(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) {
            return TrafficConstants.DEFAULT_CITY_CODE;
        }
        return cityCode.trim();
    }
}
