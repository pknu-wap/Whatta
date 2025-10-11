package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
import whatta.Whatta.user.payload.UserRegisterRequest;
import whatta.Whatta.user.repository.UserRepository;
import whatta.Whatta.user.repository.UserSettingRepository;

@Service
@AllArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    public void createUser(UserRegisterRequest request) {
        userRepository.save(User.builder()
                .installationId("user123") //로그인 구현 후 수정
                .build());

        userSettingRepository.save(UserSetting.builder()
                .userId("user123")
                .build());
    }
}
