package whatta.Whatta.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import whatta.Whatta.global.label.payload.LabelRequest;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.service.UserSettingService;

import java.util.List;

@RestController
@RequestMapping("/api/user/setting")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "User Setting", description = "유저 설정 API")
public class UserSettingController {

    private final UserSettingService userSettingService;

    @PostMapping("/label")
    @Operation(summary = "Label 생성", description = "새로운 Label을 생성합니다.")
    public ResponseEntity<?> creatLabel(@AuthenticationPrincipal String userId,
                                        @RequestBody @Validated LabelRequest request) {
        return Response.ok("success create labels", userSettingService.createLabel(userId, request));
    }

    @GetMapping("/label")
    @Operation(summary = "Label 리스트 조회", description = "유저가 가진 Label의 리스트를 제공합니다.")
    public ResponseEntity<?> getLabels(@AuthenticationPrincipal String userId) {
        return Response.ok("success get labels", userSettingService.getLabels(userId));
    }

    @PutMapping("/label/{labelId}")
    @Operation(summary = "Label 수정", description = "해당 Label의 title을 수정합니다.")
    public ResponseEntity<?> updateLabel(@AuthenticationPrincipal String userId,
                                          @PathVariable Long labelId,
                                          @RequestBody LabelRequest request) {
        userSettingService.updateLabel(userId, labelId, request);
        return Response.ok("success update label");
    }


    @DeleteMapping("/label")
    @Operation(summary = "Label 삭제", description = "해당 Label을 삭제합니다.")
    public ResponseEntity<?> deleteLabels(@AuthenticationPrincipal String userId,
                                         @RequestBody List<Long> labelIds) {
        userSettingService.deleteLabels(userId, labelIds);
        return Response.ok("success delete label");
    }
}
