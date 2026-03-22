package whatta.Whatta.user.setting.controller;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.setting.payload.request.ReminderNotiRequest;
import whatta.Whatta.user.setting.payload.request.ScheduleSummaryNotiRequest;
import whatta.Whatta.user.setting.payload.request.UserCityCodeRequest;
import whatta.Whatta.user.setting.payload.response.UserCityCodeResponse;
import whatta.Whatta.user.setting.service.UserSettingService;

import java.util.List;

@RestController
@RequestMapping("/api/user/setting/")
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "User Setting Notification", description = "유저의 알림 관련 설정 API")
public class UserSettingController {

    private final UserSettingService userSettingService;

    public UserSettingController(UserSettingService userSettingService) {
        this.userSettingService = userSettingService;
    }

    @PostMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 생성",
            description = "리마인드 알림의 새로운 기본값을 생성합니다.<br>"
                    + "<br>- day : 0 ~ (0이면 당일, 1이면 하루 전, 2면 이틀 전)"
                    + "<br>- hour : 0 ~ 23 (1이면 1시간 전)"
                    + "<br>- minute : 0 ~ 59 (30이면 30분 전)")
    public ResponseEntity<?> creatReminder(@AuthenticationPrincipal String userId,
                                           @RequestBody ReminderNotiRequest request) {
        return Response.ok("success create reminder preset", userSettingService.createReminder(userId, request));
    }

    @GetMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 리스트 조회", description = "유저가 설정한 리마인드 알림 기본값 리스트를 제공합니다.")
    public ResponseEntity<?> getReminderPresets(@AuthenticationPrincipal String userId) {
        return Response.ok("success get reminder presets", userSettingService.getReminders(userId));
    }

    @PutMapping("/reminder/{reminderId}")
    @Operation(summary = "리마인드 알림 기본값 수정", description = "해당 리마인드 알림을 수정합니다.")
    public ResponseEntity<?> updateReminder(@AuthenticationPrincipal String userId,
                                            @PathVariable String reminderId,
                                            @RequestBody ReminderNotiRequest request) {
        userSettingService.updateReminder(userId, reminderId, request);
        return Response.ok("success update reminder preset");
    }

    @DeleteMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 삭제",
            description = "해당 리마인드 알림들을 삭제합니다."
                    + "<br><br>(삭제할 리마인드 알림의 아이디 리스트를 바디로 보냅니다.)")
    public ResponseEntity<?> deleteReminders(@AuthenticationPrincipal String userId,
                                             @RequestBody List<String> reminderIds) {
        userSettingService.deleteReminders(userId, reminderIds);
        return Response.ok("success delete reminder presets");
    }

    //-------------일정 요약 알림----------------
    @PatchMapping("/summary")
    @Operation(summary = "일정 요약 알림 수정",
            description = "일정 요약 알림을 수정합니다.<br>"
                    + "<br>수정할 필드만 보낼 수 있습니다. 또는 나머지 null도 가능!"
                    + "<br>- enable : 알림 on/off"
                    + "<br>- notyfyDay : 알림 받을 날짜 TODAY/YESTERDAY"
                    + "<br>- time : 알림 받을 시간 HH:mm:ss")
    public ResponseEntity<?> updateLabel(@AuthenticationPrincipal String userId,
                                         @RequestBody ScheduleSummaryNotiRequest request) {
        userSettingService.updateSummaryNoti(userId, request);
        return Response.ok("success update schedule summary notification");
    }

    @GetMapping("/summary")
    @Operation(summary = "일정 요약 알림 조회", description = "설정된 일정 요약 알림 값을 제공합니다.")
    public ResponseEntity<?> get(@AuthenticationPrincipal String userId) {
        return Response.ok("success get schedule summary notification", userSettingService.getSummaryNoti(userId));
    }

    @PatchMapping("/cityCode")
    @Operation(summary = "기본 도시코드 수정", description = "사용자의 기본 버스 도시코드를 수정합니다.")
    public ResponseEntity<?> updateCityCode(@AuthenticationPrincipal String userId,
                                            @RequestBody @Valid UserCityCodeRequest request) {
        userSettingService.updateCityCode(userId, request);
        return Response.ok("success update city code");
    }

    @GetMapping("/cityCode")
    @Operation(summary = "기본 도시코드 조회", description = "사용자의 기본 버스 도시코드를 조회합니다.")
    public ResponseEntity<?> getCityCode(@AuthenticationPrincipal String userId) {
        UserCityCodeResponse response = userSettingService.getCityCode(userId);
        return Response.ok("success get city code", response);
    }


}
