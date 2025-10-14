package whatta.Whatta.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.UserRegisterRequest;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public String ProcessGuestLogin(String installationId) {
        //해당 installationId를 가진 유저를 확인 없으면 새로 생성
        Optional<User> userOptional = userRepository.findByInstallationId(installationId);

        User user;
        if(userOptional.isPresent()) {
            user = userOptional.get();
        }
        else{
            user = User.builder()
                    .installationId(installationId)
                    .build();
            userRepository.save(user);
        }

        return jwtTokenProvider.createToken(user.getInstallationId());
    }

    public void createUser(UserRegisterRequest request) {
        userRepository.save(User.builder()
                .installationId("user123") //로그인 구현 후 수정
                .build());

        userSettingRepository.save(UserSetting.builder()
                .userId("user123")
                .build());
    }
}
