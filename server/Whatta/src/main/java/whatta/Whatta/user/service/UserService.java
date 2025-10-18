package whatta.Whatta.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.security.JwtTokenProvider;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.response.LoginResponse;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public LoginResponse processGuestLogin(String installationId) {
        //해당 installationId를 가진 유저를 확인하고 없으면 새로 생성
        User user = userRepository.findByInstallationId(installationId).orElseGet(() -> {

            User newUser = User.builder()
                    .installationId(installationId)
                    .build();
            userRepository.save(newUser);

            UserSetting setting = UserSetting.builder()
                    .userId(installationId)
                    .build();
            userSettingRepository.save(setting);

            return newUser;
        });
        //각각 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getInstallationId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getInstallationId());

        //refresh토큰 저장
        user.updateRefreshToken(refreshToken);
        userRepository.save(user);

        return new LoginResponse(accessToken, refreshToken);
    }
}
