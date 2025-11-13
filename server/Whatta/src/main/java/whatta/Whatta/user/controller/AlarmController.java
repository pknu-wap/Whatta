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
    @Operation(summary = "리마인드 알림 오프셋 생성", description = "리마인드 알림의 새로운 기본값을 생성합니다.")
    public ResponseEntity<?> creatLabel(@AuthenticationPrincipal String userId,
                                        @RequestBody ReminderRequest request) {
        return Response.ok("success create reminder preset", alarmService.createReminder(userId, request));
    }

    @GetMapping("/reminder")
    @Operation(summary = "리마인드 알림 오프셋 리스트 조회", description = "유저가 설정한 리마인드 알림 기본값 리스트를 제공합니다.")
    public ResponseEntity<?> getLabels(@AuthenticationPrincipal String userId) {
        return Response.ok("success get reminder presets", alarmService.getReminders(userId));
    }

    @PutMapping("/reminder/{reminderId}")
    @Operation(summary = "리마인드 알림 수정", description = "해당 리마인드 알림을 수정합니다.")
    public ResponseEntity<?> updateLabel(@AuthenticationPrincipal String userId,
                                         @PathVariable String reminderId,
                                         @RequestBody ReminderRequest request) {
        alarmService.updateReminder(userId, reminderId, request);
        return Response.ok("success update reminder preset");
    }


    @DeleteMapping("/reminder")
    @Operation(summary = "리마인드 알림 삭제",
            description = "해당 리마인드 알림들을 삭제합니다."
                    + "<br><br>(삭제할 리마인드 알림의 아이디 리스트를 바디로 보냅니다.)")
    public ResponseEntity<?> deleteLabels(@AuthenticationPrincipal String userId,
                                          @RequestBody List<String> reminderIds) {
        alarmService.deleteReminders(userId, reminderIds);
        return Response.ok("success delete reminder presets");
    }
}
