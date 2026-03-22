package whatta.Whatta.traffic.payload.response;

//시/도 코드 목록 조회 Dto
public record BusCityResponse(
        String cityCode,
        String cityName
) {}
