package whatta.Whatta.traffic.client.subway.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubwayApiItem {
    private String subwayStationId;
    private String subwayStationName;//지하철역명-키워드기반일떄
    private String subwayRouteName;
    private String busRouteNo;
    private String exitNo;//출구번호
    private String dirDesc;//시설명
    private String subwayRouteId;
    private String subwayStationNm;//지하철역명
    private String dailyTypeCode;//요일구분코드
    private String upDownTypeCode;//상하행
    private String depTime;//출발시간
    private String arrTime;//도착시간
    private String endSubwayStationId;//종점지하철역ID
    private String endSubwayStationNm;//종점지하철역명
}
