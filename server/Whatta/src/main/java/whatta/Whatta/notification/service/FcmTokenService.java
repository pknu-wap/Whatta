package whatta.Whatta.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import whatta.Whatta.global.exception.ErrorCode;
import whatta.Whatta.global.exception.RestApiException;
import whatta.Whatta.notification.entity.FcmToken;
import whatta.Whatta.notification.entity.ScheduledNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.payload.request.FcmTokenRequest;
import whatta.Whatta.notification.repository.FcmTokenRepository;
import whatta.Whatta.notification.repository.ScheduledNotificationRepository;
import whatta.Whatta.user.entity.User;
import whatta.Whatta.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FcmTokenService {

    private final UserRepository userRepository;
    private final FcmTokenRepository fcmTokenRepository;
    private final ScheduledNotificationRepository scheduledNotiRepository;

    @Transactional
    public void registerFcmToken(String userId, FcmTokenRequest request) {
        User user = userRepository.findUserById(userId)
                .orElseThrow(() -> new RestApiException(ErrorCode.USER_NOT_EXIST));

        FcmToken fcmToken = fcmTokenRepository.findByUserId(userId);

        if(!request.enabled()) { //앱에서 알림 권한 비활성화 상태
            disabledNotification(userId); //예약된 알림 취소

            if(fcmToken != null) { //비활성화
                fcmTokenRepository.save(fcmToken.toBuilder()
                        .fcmToken(null)
                        .active(false)
                        .updatedAt(LocalDateTime.now())
                        .lastUsedAt(LocalDateTime.now())
                        .build());
            }
            return;
        }

        if(fcmToken == null) {
            FcmToken newToken = FcmToken.builder()
                    .userId(user.getId())
                    .fcmToken(request.fcmToken())
                    .platform(request.platform())
                    .build();
            fcmTokenRepository.save(newToken);
        } else {
            FcmToken updatedToken = fcmToken.toBuilder()
                    .fcmToken(request.fcmToken())
                    .updatedAt(LocalDateTime.now())
                    .lastUsedAt(LocalDateTime.now())
                    .build();
            fcmTokenRepository.save(updatedToken);
        }
    }

    private void disabledNotification(String userId) {
        List<ScheduledNotification> notis = scheduledNotiRepository.findByStatusAndUserId(NotiStatus.ACTIVE, userId);
        for(ScheduledNotification noti : notis) {
            scheduledNotiRepository.save(noti.toBuilder()
                    .status(NotiStatus.CANCELED)
                    .build());
        }
    }


}
