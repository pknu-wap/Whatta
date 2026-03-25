package whatta.Whatta.traffic.payload.response;

import lombok.Builder;
import whatta.Whatta.traffic.entity.SubwayFavorite;

@Builder
public record SubwayFavoriteResponse(
        String id,
        String subwayStationId,
        String subwayStationName,
        String subwayRouteName,
        String upDownTypeCode
) {
    public static SubwayFavoriteResponse fromEntity(SubwayFavorite favorite) {
        return SubwayFavoriteResponse.builder()
                .id(favorite.getId())
                .subwayStationId(favorite.getSubwayStationId())
                .subwayStationName(favorite.getSubwayStationName())
                .subwayRouteName(favorite.getSubwayRouteName())
                .upDownTypeCode(favorite.getUpDownTypeCode())
                .build();
    }
}
