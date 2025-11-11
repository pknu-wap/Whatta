package whatta.Whatta.traffic.payload.response;

public record BusArrivalResponse (
    String busRouteNo,
    int remainingBusStops,//남은 버스정류장 수
    int etaSeconds,//도착예정시간
    String busStationName


){}
