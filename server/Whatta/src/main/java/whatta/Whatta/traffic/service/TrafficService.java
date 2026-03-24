package whatta.Whatta.traffic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.traffic.TrafficConstants;
import whatta.Whatta.traffic.client.bus.BusApiClient;
import whatta.Whatta.traffic.client.bus.dto.BusApiResponse;
import whatta.Whatta.traffic.client.bus.dto.BusArrivalItem;
import whatta.Whatta.traffic.payload.response.BusArrivalResponse;
import whatta.Whatta.traffic.payload.response.BusCityResponse;
import whatta.Whatta.traffic.payload.response.BusRouteResponse;
import whatta.Whatta.traffic.payload.response.BusStationResponse;
import whatta.Whatta.user.setting.entity.UserSetting;
import whatta.Whatta.user.setting.repository.UserSettingRepository;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrafficService {

    private final BusApiClient busApiClient;
    private final UserSettingRepository userSettingRepository;

    public List<BusCityResponse> searchCities() {
        BusApiResponse rawResponse = busApiClient.getCityCode();

        if (isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToCityResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<BusStationResponse> searchStationsByGps(Double latitude, Double longitude) {

        BusApiResponse rawResponse = busApiClient.getStationListByGps(latitude, longitude);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(item -> parseToStationResponse(item, resolveCityCode(item.getCitycode())))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<BusStationResponse> searchStationsByName(String userId, String keyword, String cityCode) {
        return searchStationsByName(keyword, resolveCityCode(userId, cityCode));
    }

    public List<BusStationResponse> searchStationsByName(String keyword, String cityCode) {
        String resolvedCityCode = resolveCityCode(cityCode);

        BusApiResponse rawResponse = busApiClient.getStationList(keyword, resolvedCityCode);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(item -> parseToStationResponse(item, resolvedCityCode))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<BusRouteResponse> searchRouteByStation(String userId, String busStationId, String cityCode) {
        return searchRouteByStation(busStationId, resolveCityCode(userId, cityCode));
    }

    public List<BusRouteResponse> searchRouteByStation(String busStationId, String cityCode) {
        String resolvedCityCode = resolveCityCode(cityCode);

        BusApiResponse rawResponse = busApiClient.getRouteListByStation(busStationId, resolvedCityCode);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToRouteResponse)
                .collect(Collectors.toList());
    }

    public List<BusArrivalResponse> searchArrivalsByStation(String userId, String busStationId, String cityCode) {
        return searchArrivalsByStation(busStationId, resolveCityCode(userId, cityCode));
    }

    public List<BusArrivalResponse> searchArrivalsByStation(String busStationId, String cityCode) {
        String resolvedCityCode = resolveCityCode(cityCode);

        BusApiResponse rawResponse = busApiClient.getArrivalInfoByStation(busStationId, resolvedCityCode);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToArrivalResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<BusArrivalResponse> searchArrivalsByRoute(String userId, String busStationId, String busRouteId, String cityCode) {
        return searchArrivalsByRoute(busStationId, busRouteId, resolveCityCode(userId, cityCode));
    }

    public List<BusArrivalResponse> searchArrivalsByRoute(String busStationId, String busRouteId, String cityCode) {
        String resolvedCityCode = resolveCityCode(cityCode);

        BusApiResponse rawResponse = busApiClient.getArrivalInfoByRoute(busStationId, resolvedCityCode, busRouteId);

        if(isInvalidResponse(rawResponse)) return Collections.emptyList();

        return rawResponse.getBody().getItems().getItem().stream()
                .map(this::parseToArrivalResponse)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }



    private BusStationResponse parseToStationResponse(BusArrivalItem item, String cityCode) {
        try {
            Double lat = (item.getGpslati() != null) ? Double.parseDouble(item.getGpslati()) : null;
            Double lng = (item.getGpslong() != null) ? Double.parseDouble(item.getGpslong()) : null;

            return new BusStationResponse(
                    lat,
                    lng,
                    item.getNodeid(),
                    item.getNodenm(),
                    item.getNodeno(),
                    cityCode
            );
        } catch (NumberFormatException e) {
            log.warn("정류장 좌표 파싱 실패: {}", item);
            return null;
        }
    }

    private BusCityResponse parseToCityResponse(BusArrivalItem item) {
        if (item.getCitycode() == null || item.getCitycode().isBlank()) {
            return null;
        }

        return new BusCityResponse(
                item.getCitycode().trim(),
                item.getCityname()
        );
    }

    private BusRouteResponse parseToRouteResponse(BusArrivalItem item) {
        return new BusRouteResponse(
                item.getRouteid(),
                item.getRouteno(),
                item.getEndnodenm(),
                item.getStartnodenm()
        );
    }


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

    private boolean isInvalidResponse(BusApiResponse response) {
        return response == null ||
                response.getBody() == null ||
                response.getBody().getItems() == null ||
                response.getBody().getItems().getItem() == null;

    }

    private String resolveCityCode(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) {
            return TrafficConstants.DEFAULT_CITY_CODE;
        }
        return cityCode.trim();
    }

    private String resolveCityCode(String userId, String cityCode) {
        if (cityCode != null && !cityCode.isBlank()) {
            return cityCode.trim();
        }

        return userSettingRepository.findByUserId(userId)
                .map(UserSetting::getCityCode)
                .map(this::resolveCityCode)
                .orElse(TrafficConstants.DEFAULT_CITY_CODE);
    }
}
