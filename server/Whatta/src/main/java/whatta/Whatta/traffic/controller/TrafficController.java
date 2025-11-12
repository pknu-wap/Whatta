package whatta.Whatta.traffic.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.traffic.payload.response.BusArrivalResponse;
import whatta.Whatta.traffic.payload.response.BusRouteResponse;
import whatta.Whatta.traffic.payload.response.BusStationResponse;
import whatta.Whatta.traffic.service.TrafficService;

import java.util.List;

@Tag(name = "Traffic", description = "Traffic API")
@RestController
@RequestMapping("/api/traffic")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
public class TrafficController {

    private final TrafficService trafficService;

    @GetMapping("/station/searchGps")
    @Operation(summary = "좌표 기반 근접 정류장 검색(GPS)", description = "현재 좌표를 기반으로 반경 500m 내의 정류장 목록을 반환합니다.")
    public ResponseEntity<?> searchStationsByGps(
            @Parameter(description = "위도") @RequestParam Double latitude,
            @Parameter(description = "경도") @RequestParam Double longitude
    ) {
        List<BusStationResponse> stations = trafficService.searchStationsByGps(latitude, longitude);
        return Response.ok("주변 정류소 검색 성공", stations);
    }

    @GetMapping("/station/searchName")
    @Operation(summary = "정류장 키워드 검색", description = "정류장명 또는 번호로 검색하여 정류장 목록을 반환합니다.")
    public ResponseEntity<?> searchStationsByName(
            @Parameter(description = "검색할 정류장명 또는 번호 (예: 북대전농협, 44810)") @RequestParam String keyword
    ) {
        List<BusStationResponse> stations = trafficService.searchStationsByName(keyword);
        return Response.ok("정류장 키워드 검색 성공", stations);
    }

    @GetMapping("/station/searchRoutes/{busStationId}")
    @Operation(summary = "정류장별 경유노선 목록 조회", description = "해당 정류장을 경유하는 모든 버스 노선 목록을 반환합니다.")
    public ResponseEntity<?> searchRoutesByStation(
            @Parameter(description = "경유노선을 조회할 정류장ID (예: DJB8001793)") @PathVariable String busStationId
    ) {
        List<BusRouteResponse> routes = trafficService.searchRouteByStation(busStationId);
        return Response.ok("정류장별 경유노선 조회 성공", routes);
    }

    @GetMapping("/bus/arrivalStation/{busStationId}")
    @Operation(summary = "정류장별 도착예정정보 조회", description = "정류장별로 실시간 도착예정정보 및 운행정보 목록을 반환합니다.")
    public ResponseEntity<?> searchArrivalsByStation(
            @Parameter(description = "경유노선을 조회할 정류장ID (예: DJB8001793)") @PathVariable String busStationId
    ) {
        List<BusArrivalResponse> arrivalResponses = trafficService.searchArrivalsByStation(busStationId);
        return Response.ok("정류장별 도착예정정보 조회 성공", arrivalResponses);
    }

    @GetMapping("/bus/arrivalRoute/{busStationId}/{busRouteId}")
    @Operation(summary = "특정노선 도착예정정보 조회", description = "특정노선의 실시간 도착예정정보 및 운행정보 목록을 반환합니다.")
    public ResponseEntity<?> searchArrivalsByRoute(
            @Parameter(description = "경유노선을 조회할 정류장ID (예: DJB8001793)") @PathVariable String busStationId,
            @Parameter(description = "조회할 경유노선ID (예: DJB30300050)") @PathVariable String busRouteId

    ) {
        List<BusArrivalResponse> arrivalResponses = trafficService.searchArrivalsByRoute(busStationId, busRouteId);
        return Response.ok("특정노선 도착예정정보 조회 성공", arrivalResponses);
    }
}
