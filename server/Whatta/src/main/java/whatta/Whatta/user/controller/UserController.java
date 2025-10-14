package whatta.Whatta.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import whatta.Whatta.global.payload.Response;
import whatta.Whatta.user.payload.UserRegisterRequest;
import whatta.Whatta.user.service.UserService;

@RestController
@RequestMapping("/api/user")
@AllArgsConstructor
@Tag(name = "User", description = "유저 API")
public class UserController {

    private final UserService userService;

    @PostMapping("/guest/login")
    @Operation(summary = "Jwt 발급", description = "게스트 로그인 및 Jwt 발급")
    public ResponseEntity<?> guestLogin(@RequestBody GuestLoginRequest request){
        String jwt = userService.proccessGuestLogin request);
        return Response.ok("로그인 성공 및 토큰 발급 완료", new JwtRep); //TODO: 추후 accessToken 보내야 함
    }
}
