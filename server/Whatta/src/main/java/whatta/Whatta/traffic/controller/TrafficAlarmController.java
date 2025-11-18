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
import whatta.Whatta.traffic.payload.request.BusItemCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficAlarmCreateRequest;
import whatta.Whatta.traffic.payload.request.TrafficAlarmUpdateRequest;
import whatta.Whatta.traffic.payload.response.BusItemResponse;
import whatta.Whatta.traffic.payload.response.TrafficAlarmResponse;
import whatta.Whatta.traffic.service.BusItemService;
import whatta.Whatta.traffic.service.TrafficAlarmService;

import java.util.List;

@Tag(name = "Traffic Alarm", description = "교통 알림 및 즐겨찾기 관리 API")
@RestController
@RequestMapping("/api/traffic")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
public class TrafficAlarmController {

    private final TrafficAlarmService trafficAlarmService;
    private final BusItemService busItemService;

    @PostMapping("/items")
    @Operation(summary = "교통 즐겨찾기 추가", description = "자주 이용하는 버스 노선을 즐겨찾기에 추가합니다.")
    public ResponseEntity<?> createBusItem(
            @AuthenticationPrincipal String userId,
            @RequestBody @Validated BusItemCreateRequest request
    ){
        BusItemResponse response = busItemService.createItem(userId, request);
        return Response.ok("즐겨찾기 추가 성공", response);
    }

    @DeleteMapping("/items/{itemId}")
    @Operation(summary = "교통 즐겨찾기 삭제", description = "해당 버스 노선을 즐겨찾기에서 삭제합니다.")
    public ResponseEntity<?> deleteBusItem(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "삭제할 즐겨찾기 ID") @PathVariable String itemId
    ){
        busItemService.deleteItem(userId, itemId);
        return Response.ok("해당 즐겨찾기 삭제 성공");
    }

    @GetMapping("/items")
    @Operation(summary = "즐겨찾기 목록 조회", description = "즐겨찾기 목록을 조회합니다.")
    public ResponseEntity<?> getMyBusItems(
            @AuthenticationPrincipal String userId
    ){
        List<BusItemResponse> response = busItemService.getMyItems(userId);
        return Response.ok("즐겨찾기 목록 조회 성공", response);
    }

    @PostMapping("/alarms")
    @Operation(summary = "교통알림 생성", description = "선택한 즐겨찾기 항목들에 대해 알림을 생성합니다.")
    public ResponseEntity<?> createTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @RequestBody @Validated TrafficAlarmCreateRequest request
    ) {
        TrafficAlarmResponse response = trafficAlarmService.createAlarm(userId, request);
        return Response.ok("교통알림 생성 성공", response);
    }

    @GetMapping("/alarms")
    @Operation(summary = "알림설정 목록 조회", description = "사용자가 설정한 모든 교통알림 목록을 조회합니다.")
    public ResponseEntity<?> getMyTrafficAlarms(
            @AuthenticationPrincipal String userId
    ) {
        List<TrafficAlarmResponse> response = trafficAlarmService.getTrafficAlarms(userId);
        return Response.ok("교통알림 목록 조회 성공", response);
    }

    @PatchMapping("/alarms/{alarmId}")
    @Operation(summary = "교통알림 수정", description = "알림 시간, 요일, 노선 변경 및 알림 ON/OFF를 수정합니다.")
    public ResponseEntity<?> updateTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "수정할 알림 ID") @PathVariable String alarmId,
            @RequestBody @Validated TrafficAlarmUpdateRequest request
    ) {
        TrafficAlarmResponse response = trafficAlarmService.updateAlarm(userId, alarmId, request);
        return Response.ok("교통알림 수정 성공", response);
    }

    @DeleteMapping("/alarms/{alarmId}")
    @Operation(summary = "교통알림 삭제", description = "특정 교통알림 설정을 삭제합니다.")
    public ResponseEntity<?> deleteTrafficAlarm(
            @AuthenticationPrincipal String userId,
            @Parameter(description = "삭제할 알림 ID") @PathVariable String alarmId
    ) {
        trafficAlarmService.deleteAlarm(userId, alarmId);
        return Response.ok("교통알림 삭제 성공");
    }
}
