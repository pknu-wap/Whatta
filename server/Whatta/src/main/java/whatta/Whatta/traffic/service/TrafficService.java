package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.traffic.client.bus.BusApiClient;
import whatta.Whatta.traffic.client.bus.dto.BusApiResponse;
import whatta.Whatta.traffic.client.bus.dto.BusArrivalItem;
import whatta.Whatta.traffic.payload.response.BusArrivalResponse;
import whatta.Whatta.traffic.payload.response.BusRouteResponse;
import whatta.Whatta.traffic.payload.response.BusStationResponse;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrafficService {

    private final BusApiClient busApiClient;
    private static final String FIXED_CITY_CODE = "21";//시티코드 구현 전까지 부산으로 가정하고 구현

    //좌표기반근접 정류장 검색
    public List<BusStationResponse> searchStationsByGps(Double latitude, Double longitude) {

        BusApiResponse rawResponse = busApiClient.getStationListByGps(latitude, longitude);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToStationResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    //정류장명으로 정류장 검색
    public List<BusStationResponse> searchStationsByName(String keyword) {
        
        BusApiResponse rawResponse = busApiClient.getStationList(keyword, FIXED_CITY_CODE);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToStationResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    //정류장별 경유노선 목록을 조회
    public List<BusRouteResponse> searchRouteByStation(String busStationId) {

        BusApiResponse rawResponse = busApiClient.getRouteListByStation(busStationId, FIXED_CITY_CODE);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToRouteResponse)
                .collect(Collectors.toList());
    }

    //정류장별로 실시간 도착예정정보 및 운행정보 목록을 조회
    public List<BusArrivalResponse> searchArrivalsByStation(String busStationId) {

        BusApiResponse rawResponse = busApiClient.getArrivalInfoByStation(busStationId, FIXED_CITY_CODE);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToArrivalResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    //특정노선의 실시간 도착예정정보 및 운행정보 목록을 조회
    public List<BusArrivalResponse> searchArrivalsByRoute(String busStationId, String busRouteId) {

        BusApiResponse rawResponse = busApiClient.getArrivalInfoByRoute(busStationId, FIXED_CITY_CODE, busRouteId);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToArrivalResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }



    //정류장 목록 조회 파싱 메서드
    private BusStationResponse parseToStationResponse(BusArrivalItem item) {
        try {
            Double lat = (item.getGpslati() != null) ? Double.parseDouble(item.getGpslati()) : null;
            Double lng = (item.getGpslong() != null) ? Double.parseDouble(item.getGpslong()) : null;

            return new BusStationResponse(
                    lat,
                    lng,
                    item.getNodeid(),
                    item.getNodenm(),
                    item.getNodeno(),
                    FIXED_CITY_CODE
            );
        } catch (NumberFormatException e) {
            log.warn("정류장 좌표 파싱 실패: {}", item);
            return null;
        }
    }
    //정류장별버스노선 조회 파싱 메서드
    private BusRouteResponse parseToRouteResponse(BusArrivalItem item) {
        return new BusRouteResponse(
                item.getNodeid(),
                item.getNodenm(),
                item.getEndnodenm(),
                item.getStartnodenm()
        );
    }

    //정류장별 혹은 특정노선 도착예정 조회 파싱 메서드
    private BusArrivalResponse parseToArrivalResponse(BusArrivalItem item) {
        try {
            int remainingBusStops = Integer.parseInt(item.getArrprevstationcnt());
            int etaSeconds = Integer.parseInt(item.getArrtime());

            return new BusArrivalResponse(
                    item.getNodeid(),
                    item.getNodenm(),
                    item.getRouteid(),
                    item.getRouteno(),
                    remainingBusStops,
                    etaSeconds
            );
        } catch (NumberFormatException e){
            log.warn("버스 도착 정보 파싱 실패(숫자 변환 실패): {}", item);
            return null;
        }
    }

    //response 유효성 검사
    private boolean isInvalidResponse(BusApiResponse response) {
        return response == null ||
                response.getBody() == null ||
                response.getBody().getItems() == null ||
                response.getBody().getItems().getItem() == null;

    }
}
