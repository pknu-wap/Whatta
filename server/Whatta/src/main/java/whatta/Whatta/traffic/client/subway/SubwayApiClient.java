package whatta.Whatta.traffic.client.subway;

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
import whatta.Whatta.traffic.client.subway.dto.SubwayApiResponse;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubwayApiClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${public.data.subway.url}")
    private String subwayBaseUrl;

    @Value("${public.data.subway.key:${public.data.bus.key}}")
    private String serviceKey;

    //키워드기반 지하철역 목록 조회
    public SubwayApiResponse getStationList(String keyword) {
        String operationPath = "/GetKwrdFndSubwaySttnList";
        String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);

        URI uri = UriComponentsBuilder
                .fromUriString(subwayBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("subwayStationName", encodedKeyword)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }

    //지하철역별 시간표 목록조회
    public SubwayApiResponse getScheduleList(String subwayStationId, String dailyTypeCode, String upDownTypeCode) {
        String operationPath = "/GetSubwaySttnAcctoSchdulList";

        URI uri = UriComponentsBuilder
                .fromUriString(subwayBaseUrl + operationPath)
                .queryParam("serviceKey", serviceKey)
                .queryParam("subwayStationId", subwayStationId)
                .queryParam("dailyTypeCode", dailyTypeCode)
                .queryParam("upDownTypeCode", upDownTypeCode)
                .queryParam("_type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 999)
                .build(true)
                .toUri();

        return callApi(uri);
    }

    private SubwayApiResponse callApi(URI uri) {
        log.info(">>> 지하철 API 요청 path: {}", uri.getPath());
        try {
            String jsonString = restTemplate.getForObject(uri, String.class);
            JsonNode rootNode = objectMapper.readTree(jsonString);
            JsonNode responseNode = rootNode.path("response");

            if (responseNode.isMissingNode() || responseNode.isNull()) {
                throw new RestApiException(ErrorCode.PUBLIC_SUBWAY_API_FAILED);
            }

            SubwayApiResponse response = objectMapper.treeToValue(responseNode, SubwayApiResponse.class);

            if (response == null || response.getHeader() == null || !"00".equals(response.getHeader().getResultCode())) {
                log.warn("지하철 공공데이터 API 호출 실패: path={}", uri.getPath());
                throw new RestApiException(ErrorCode.PUBLIC_SUBWAY_API_FAILED);
            }
            return response;
        } catch (RestApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("지하철 API 호출 중 예외 발생: path={}, type={}",
                    uri.getPath(), e.getClass().getSimpleName());
            throw new RestApiException(ErrorCode.PUBLIC_SUBWAY_API_FAILED);
        }
    }
}
