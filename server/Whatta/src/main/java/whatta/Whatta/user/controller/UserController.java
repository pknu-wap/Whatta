package whatta.Whatta.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.payload.request.GuestLoginRequest;
import whatta.Whatta.user.payload.response.LoginResponse;
import whatta.Whatta.user.service.UserService;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "User", description = "유저 API")
public class UserController {

    private final UserService userService;

    @PostMapping("/guest/login")
    @Operation(summary = "게스트 로그인 및 Jwt 발급", description = "installation id로 유저를 식별하여 토큰을 발급합니다.")
    public ResponseEntity<?> guestLogin(@RequestBody GuestLoginRequest request){
        LoginResponse response = userService.processGuestLogin(request.getInstallationId());
        return Response.ok("로그인 성공 및 토큰 발급 완료", response);
    }
}
