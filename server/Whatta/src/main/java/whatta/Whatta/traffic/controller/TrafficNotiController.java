package whatta.Whatta.traffic.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import whatta.Whatta.global.payload.Response;
import whatta.Whatta.traffic.payload.request.BusFavoriteCreateRequest;
import whatta.Whatta.traffic.payload.request.SubwayFavoriteCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficNotiCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficNotiUpdateRequest;
import whatta.Whatta.traffic.payload.response.BusFavoriteResponse;
import whatta.Whatta.traffic.payload.response.SubwayFavoriteResponse;
import whatta.Whatta.traffic.payload.response.TrafficNotiResponse;
import whatta.Whatta.traffic.service.BusFavoriteService;
import whatta.Whatta.traffic.service.SubwayFavoriteService;
import whatta.Whatta.traffic.service.TrafficNotiService;

import java.util.List;

@Tag(name = "Traffic Alarm", description = "교통 알림 및 즐겨찾기 관리 API")
@RestController
@RequestMapping("/api/traffic")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
public class TrafficNotiController {

    private final TrafficNotiService trafficNotiService;
    private final BusFavoriteService busFavoriteService;
    private final SubwayFavoriteService subwayFavoriteService;

    @PostMapping("/bus/items")
    @Operation(summary = "버스 즐겨찾기 추가", description = "자주 이용하는 버스 노선을 즐겨찾기에 추가합니다.")
    public ResponseEntity<?> createBusItem(
            @AuthenticationPrincipal String userId,
            @RequestBody @Validated BusFavoriteCreateRequest request
    ){
        BusFavoriteResponse response = busFavoriteService.createBusFavorite(userId, request);
        return Response.ok("버스 즐겨찾기 추가 성공", response);
    }

    @DeleteMapping("/bus/items/{itemId}")
    @Operation(summary = "버스 즐겨찾기 삭제", description = "해당 버스 노선을 즐겨찾기에서 삭제합니다.")
    public ResponseEntity<?> deleteBusItem(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "삭제할 버스 즐겨찾기 ID") @PathVariable String itemId
    ){
        busFavoriteService.deleteBusFavorite(userId, itemId);
        return Response.ok("해당 버스 즐겨찾기 삭제 성공");
    }

    @GetMapping("/bus/items")
    @Operation(summary = "버스 즐겨찾기 목록 조회", description = "즐겨찾기 목록을 조회합니다.")
    public ResponseEntity<?> getMyBusItems(
            @AuthenticationPrincipal String userId
    ){
        List<BusFavoriteResponse> response = busFavoriteService.getMyFavorite(userId);
        return Response.ok("버스 즐겨찾기 목록 조회 성공", response);
    }

    @PostMapping("/subway/items")
    @Operation(summary = "지하철 즐겨찾기 추가", description = "자주 이용하는 지하철 역/노선을 즐겨찾기에 추가합니다.")
    public ResponseEntity<?> createSubwayItem(
            @AuthenticationPrincipal String userId,
            @RequestBody @Validated SubwayFavoriteCreateRequest request
    ) {
        SubwayFavoriteResponse response = subwayFavoriteService.createSubwayFavorite(userId, request);
        return Response.ok("지하철 즐겨찾기 추가 성공", response);
    }

    @DeleteMapping("/subway/items/{itemId}")
    @Operation(summary = "지하철 즐겨찾기 삭제", description = "해당 지하철 즐겨찾기를 삭제합니다.")
    public ResponseEntity<?> deleteSubwayItem(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "삭제할 지하철 즐겨찾기 ID") @PathVariable String itemId
    ) {
        subwayFavoriteService.deleteSubwayFavorite(userId, itemId);
        return Response.ok("해당 지하철 즐겨찾기 삭제 성공");
    }

    @GetMapping("/subway/items")
    @Operation(summary = "지하철 즐겨찾기 목록 조회", description = "사용자의 지하철 즐겨찾기 목록을 조회합니다.")
    public ResponseEntity<?> getMySubwayItems(
            @AuthenticationPrincipal String userId
    ) {
        List<SubwayFavoriteResponse> response = subwayFavoriteService.getMyFavorite(userId);
        return Response.ok("지하철 즐겨찾기 목록 조회 성공", response);
    }

    @PostMapping("/alarms")
    @Operation(summary = "교통알림 생성", description = "선택한 즐겨찾기 항목들에 대해 알림을 생성합니다.")
    public ResponseEntity<?> createTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @RequestBody @Validated TrafficNotiCreateRequest request
    ) {
        TrafficNotiResponse response = trafficNotiService.createTrafficNoti(userId, request);
        return Response.ok("교통알림 생성 성공", response);
    }

    @GetMapping("/alarms")
    @Operation(summary = "교통알림 목록 조회", description = "사용자가 설정한 모든 교통알림 목록을 조회합니다.")
    public ResponseEntity<?> getMyTrafficAlarms(
            @AuthenticationPrincipal String userId
    ) {
        List<TrafficNotiResponse> response = trafficNotiService.getTrafficNotis(userId);
        return Response.ok("교통알림 목록 조회 성공", response);
    }

    @PatchMapping("/alarms/{alarmId}")
    @Operation(summary = "교통알림 수정", description = "알림 시간, 요일, 노선 변경 및 알림 ON/OFF를 수정합니다.")
    public ResponseEntity<?> updateTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "수정할 교통알림 ID") @PathVariable String alarmId,
            @RequestBody @Validated TrafficNotiUpdateRequest request
    ) {
        TrafficNotiResponse response = trafficNotiService.updateTrafficNoti(userId, alarmId, request);
        return Response.ok("교통알림 수정 성공", response);
    }

    @DeleteMapping("/alarms/{alarmId}")
    @Operation(summary = "교통알림 삭제", description = "특정 교통알림 설정을 삭제합니다.")
    public ResponseEntity<?> deleteTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "삭제할 교통알림 ID") @PathVariable String alarmId
    ) {
        trafficNotiService.deleteTrafficNoti(userId, alarmId);
        return Response.ok("교통알림 삭제 성공");
    }
}
