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

    @PostMapping
    @Operation(summary = "유저 생성", description = "임시로 만든 테스트를 위한 API 입니다.")
    public ResponseEntity<?> registerUser(@RequestBody @Validated UserRegisterRequest request){
        userService.createUser(request);
        return Response.ok("success register"); //TODO: 추후 accessToken 보내야 함
    }
}
