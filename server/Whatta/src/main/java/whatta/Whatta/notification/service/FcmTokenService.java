package whatta.Whatta.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.notification.entity.FcmToken;
import whatta.Whatta.notification.payload.request.FcmTokenRequest;
import whatta.Whatta.notification.repository.FcmTokenRepository;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.repository.UserRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class FcmTokenService {

    private final UserRepository userRepository;
    private final FcmTokenRepository fcmTokenRepository;

    public void registerFcmToken(String userId, FcmTokenRequest request) {
        User user = userRepository.findUserById(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        FcmToken token = fcmTokenRepository.findByFcmToken(request.fcmToken());
        if(token == null) {
            FcmToken newToken = FcmToken.builder()
                    .userId(user.getId())
                    .fcmToken(request.fcmToken())
                    .platform(request.platform())
                    .build();
            fcmTokenRepository.save(newToken);
        } else {
            FcmToken updatedToken = token.toBuilder()
                    .fcmToken(request.fcmToken())
                    .updatedAt(LocalDateTime.now())
                    .lastUsedAt(LocalDateTime.now())
                    .build();
            fcmTokenRepository.save(updatedToken);
        }
    }


}
