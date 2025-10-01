package whatta.Whatta.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.payload.UserRegisterRequest;
import whatta.Whatta.user.repository.UserRepository;

@Service
@AllArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public void createUser(UserRegisterRequest request) {
        userRepository.save(User.builder()
                .installationId("user123")
                .userSetting(request.getUserSetting())
                .build());
    }
}
