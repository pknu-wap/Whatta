package whatta.Whatta.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.payload.request.ReminderRequest;
import whatta.Whatta.user.payload.request.ScheduleSummaryAlarmRequest;
import whatta.Whatta.user.service.AlarmService;

import java.util.List;

@RestController
@RequestMapping("/api/user/setting/")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Alarm", description = "알림 설정 API")
public class AlarmController {

    private final AlarmService alarmService;

    @PostMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 생성",
            description = "리마인드 알림의 새로운 기본값을 생성합니다.<br>"
                    + "<br>- day : 0 ~ (0이면 당일, 1이면 하루 전, 2면 이틀 전)"
                    + "<br>- hour : 0 ~ 23 (1이면 1시간 전)"
                    + "<br>- minute : 0 ~ 59 (30이면 30분 전)")
    public ResponseEntity<?> creatReminder(@AuthenticationPrincipal String userId,
                                        @RequestBody ReminderRequest request) {
        return Response.ok("success create reminder preset", alarmService.createReminder(userId, request));
    }

    @GetMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 리스트 조회", description = "유저가 설정한 리마인드 알림 기본값 리스트를 제공합니다.")
    public ResponseEntity<?> getReminderPresets(@AuthenticationPrincipal String userId) {
        return Response.ok("success get reminder presets", alarmService.getReminders(userId));
    }

    @PutMapping("/reminder/{reminderId}")
    @Operation(summary = "리마인드 알림 기본값 수정", description = "해당 리마인드 알림을 수정합니다.")
    public ResponseEntity<?> updateReminder(@AuthenticationPrincipal String userId,
                                         @PathVariable String reminderId,
                                         @RequestBody ReminderRequest request) {
        alarmService.updateReminder(userId, reminderId, request);
        return Response.ok("success update reminder preset");
    }

    @DeleteMapping("/reminder")
    @Operation(summary = "리마인드 알림 기본값 삭제",
            description = "해당 리마인드 알림들을 삭제합니다."
                    + "<br><br>(삭제할 리마인드 알림의 아이디 리스트를 바디로 보냅니다.)")
    public ResponseEntity<?> deleteReminders(@AuthenticationPrincipal String userId,
                                          @RequestBody List<String> reminderIds) {
        alarmService.deleteReminders(userId, reminderIds);
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
                                         @RequestBody ScheduleSummaryAlarmRequest request) {
        alarmService.updateSummaryAlarm(userId, request);
        return Response.ok("success update schedule summary alarm");
    }

    @GetMapping("/summary")
    @Operation(summary = "일정 요약 알림 조회", description = "설정된 일정 요약 알림 값을 제공합니다.")
    public ResponseEntity<?> get(@AuthenticationPrincipal String userId) {
        return Response.ok("success get schedule summary alarm", alarmService.getSummaryAlarm(userId));
    }


}
