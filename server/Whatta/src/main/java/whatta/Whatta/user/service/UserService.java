package whatta.Whatta.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.security.JwtTokenProvider;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.entity.UserSetting;
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
    public String processGuestLogin(String installationId) {
        //해당 installationId를 가진 유저를 확인하고 없으면 새로 생성
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

            userSettingRepository.save(UserSetting.builder()
                    .userId(installationId)
                    .build());
        }


        return jwtTokenProvider.createToken(user.getInstallationId());
    }
}
