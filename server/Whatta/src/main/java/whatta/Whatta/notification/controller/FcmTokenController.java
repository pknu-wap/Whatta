package whatta.Whatta.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.notification.payload.request.FcmTokenRequest;
import whatta.Whatta.notification.service.FcmTokenService;

@RestController
@RequestMapping("/api/fcm")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Fcm", description = "Fcm API")
public class FcmTokenController {

    private final FcmTokenService fcmTokenService;

    @PostMapping("/token")
    @Operation(summary = "FCM 토큰 저장",
            description = "installationId 별로 FCM 토큰을 저장합니다."
                    + "<br>- platform : IOS | ANDROID | WEBs ")
    public ResponseEntity<?> registerFcmToken (@AuthenticationPrincipal String userId,
                                               @RequestBody @Validated FcmTokenRequest request) {
        fcmTokenService.registerFcmToken(userId, request);
        return Response.ok("success register FCM token");
    }
}
