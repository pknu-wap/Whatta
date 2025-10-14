package whatta.Whatta.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.payload.response.LoginResponse;
import whatta.Whatta.user.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "재발급 API")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/refresh")
    @Operation(summary = "Jwt 재발급", description = "Jwt Refresh토큰 재발급")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        LoginResponse response = authService.refreshToken(request);
        return Response.ok("토큰이 재발급되었습니다.", response);
    }

}
