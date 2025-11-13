package whatta.Whatta.traffic.payload.response;

//정류소별경유노선 목록조회 Dto
public record BusRouteResponse(
    String busRouteId,
    String busRouteNo,
    String endBusStationName,
    String startBusStationName
) {}
