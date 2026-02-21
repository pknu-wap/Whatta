package whatta.Whatta.traffic.client.bus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.traffic.client.bus.dto.BusApiResponse;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class BusApiClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // 국토교통부_(TAGO)_버스도착정보
    @Value("${public.data.bus.url}")
    private String arrivalBaseUrl;

    //국토교통부_(TAGO)_버스정류소정보
    @Value("${public.data.bus.station.url}")
    private String stationBaseUrl;

    // 국토교통부_(TAGO) 서비스키
    @Value("${public.data.bus.key}")
    private String serviceKey;





    //GPS좌표를 기반으로 근처(반경 500m)에 있는 정류장을 검색
    public BusApiResponse getStationListByGps(Double gpsLati, Double gpsLong){
        String operationPath = "/getCrdntPrxmtSttnList";

        URI uri = UriComponentsBuilder
                .fromUriString(stationBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("gpsLati", gpsLati)
                .queryParam("gpsLong", gpsLong)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }

    //정류소명과 정류소 고유번호를 이용하여 정류소의 정보를 검색
    public BusApiResponse getStationList(String keyword, String cityCode){
        String operationPath = "/getSttnNoList";

        String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);

        URI uri = UriComponentsBuilder
                .fromUriString(stationBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("cityCode", cityCode)
                .queryParam("nodeNm", encodedKeyword)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }
    //정류장별 경유노선 목록을 조회
    public BusApiResponse getRouteListByStation(String nodeId, String cityCode){
        String operationPath = "/getSttnThrghRouteList";

        URI uri = UriComponentsBuilder
                .fromUriString(stationBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("cityCode", cityCode)
                .queryParam("nodeid", nodeId)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }

    //정류소별로 실시간 도착예정정보 및 운행정보 목록을 조회
    public BusApiResponse getArrivalInfoByStation(String nodeId, String cityCode){
        String operationPath = "/getSttnAcctoArvlPrearngeInfoList";

        URI uri = UriComponentsBuilder
                .fromUriString(arrivalBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("cityCode", cityCode)
                .queryParam("nodeId", nodeId)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }



    //특정노선의 실시간 도착예정정보 및 운행정보 목록을 조회
    public BusApiResponse getArrivalInfoByRoute(String nodeId, String cityCode, String routeId) {
        String operationPath = "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList";

        URI uri = UriComponentsBuilder
                .fromUriString(arrivalBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("cityCode", cityCode)
                .queryParam("nodeId", nodeId)
                .queryParam("routeId", routeId)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }

    private BusApiResponse callApi(URI uri){
        log.info(">>> 실제 요청 URI: {}", uri.toString());
        try {
            String jsonString = restTemplate.getForObject(uri, String.class);

            JsonNode rootNode = objectMapper.readTree(jsonString);

            JsonNode responseNode = rootNode.path("response");

            BusApiResponse response = objectMapper.treeToValue(responseNode, BusApiResponse.class);

            if(response == null || response.getHeader() == null || !"00".equals(response.getHeader().getResultCode())) {
                log.warn("공공데이터 API 호출 실패: uri={}", uri);
                throw new RestApiException(ErrorCode.PUBLIC_BUS_API_FAILED);
            }
            return response;
        } catch (Exception e) {
            log.error("API 호출 중 예외 발생: {}", e.getMessage());
            throw new RestApiException(ErrorCode.PUBLIC_BUS_API_FAILED);
        }
    }


}
