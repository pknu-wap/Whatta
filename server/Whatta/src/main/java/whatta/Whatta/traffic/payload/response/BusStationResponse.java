package whatta.Whatta.traffic.payload.response;

//좌표기반근접정류소 목록조회, 정류장명,번호기반정류소 목록조회 Dto
public record BusStationResponse(
        String latitude,//위도
        String longitude,//경도
        String busStationId,
        String busStationName,
        String busStationNo,
        String cityCode
) {}
