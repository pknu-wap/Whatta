package whatta.Whatta.user.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.global.security.JwtTokenProvider;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.payload.response.LoginResponse;
import whatta.Whatta.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Transactional
    public LoginResponse refreshToken(HttpServletRequest request) {
        //헤더에서 refresh토큰 추출
        String refreshToken = jwtTokenProvider.resolveToken(request);

        //refresh토큰 유효성 검사
        if(refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            throw new RestApiException(ErrorCode.INVALID_TOKEN);
        }

        //userId 추출
        Authentication authentication = jwtTokenProvider.getAuthentication(refreshToken);
        String userId = authentication.getName();

        //user 조회 및 refreshToken 일치 확인
        User user = userRepository.findUserById(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        if(user.getRefreshToken() == null || !user.getRefreshToken().equals(refreshToken)) {
            throw new RestApiException(ErrorCode.INVALID_TOKEN);
        }

        //토큰 생성
        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        //DB에 저장
        user.updateRefreshToken(newRefreshToken);
        userRepository.save(user);

        return new LoginResponse(newAccessToken, newRefreshToken);
    }
}
