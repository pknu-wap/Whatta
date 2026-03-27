package whatta.Whatta.traffic.payload.response;

public record SubwayScheduleResponse(
        String subwayRouteId,
        String subwayStationId,
        String subwayStationName,
        String dailyTypeCode,
        String upDownTypeCode,
        String departureTime,
        String arrivalTime,
        String endSubwayStationId,
        String endSubwayStationName
) {}
