package whatta.Whatta.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.entity.FcmToken;
import whatta.Whatta.notification.repository.FcmTokenRepository;

import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class NotificationSendService {

    private final FcmTokenRepository fcmTokenRepository;
    private final FirebaseMessaging firebaseMessaging;

    public NotificationSendResult sendSummary(String userId, String title, String body) {
        FcmToken token = fcmTokenRepository.findByUserId(userId);
        if (token == null || token.getFcmToken() == null || token.getFcmToken().isBlank()) {
            log.warn("FCM token not found. userId={}", userId);
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        return send(userId, "SUMMARY", null, token.getFcmToken(), title, body, Map.of(
                "type", "SUMMARY",
                "userId", userId)
        );
    }

    public NotificationSendResult sendReminder(String userId, String title, String body, String targetId) {
        FcmToken token = fcmTokenRepository.findByUserId(userId);
        if (token == null || token.getFcmToken() == null || token.getFcmToken().isBlank()) {
            log.warn("FCM token not found. userId={}", userId);
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        return send(userId, "REMINDER", targetId, token.getFcmToken(), title, body, Map.of(
                "type", "REMINDER",
                "userId", userId,
                "targetId", targetId
        ));
    }

    public NotificationSendResult sendTaskDue(String userId, String title, String body, String targetId) {
        FcmToken token = fcmTokenRepository.findByUserId(userId);
        if (token == null || token.getFcmToken() == null || token.getFcmToken().isBlank()) {
            log.warn("FCM token not found. userId={}", userId);
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        return send(userId, "TASK_DUE", targetId, token.getFcmToken(), title, body, Map.of(
                "type", "TASK_DUE",
                "userId", userId,
                "targetId", targetId
        ));
    }

    public NotificationSendResult sendTrafficAlarm(String userId, String title, String body) {
        FcmToken token = fcmTokenRepository.findByUserId(userId);
        if (token == null || token.getFcmToken() == null || token.getFcmToken().isBlank()) {
            log.warn("FCM token not found. userId={}", userId);
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        return send(userId, "TRAFFIC", null, token.getFcmToken(), title, body, Map.of(
                "type", "TRAFFIC",
                "userId", userId
        ));
    }

    private NotificationSendResult send(
            String userId,
            String notificationType,
            String targetId,
            String token,
            String title,
            String body,
            Map<String, String> data
    ) {
        Notification notification = Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build();

        Message.Builder builder = Message.builder()
                .setToken(token)
                .setNotification(notification);

        if (data != null && !data.isEmpty()) {
            builder.putAllData(data);
        }

        Message message = builder.build();

        try {
            firebaseMessaging.send(message);
            return NotificationSendResult.SUCCESS;
        } catch (FirebaseMessagingException e) {
            NotificationSendResult result = classifyFirebaseFailure(e);
            MessagingErrorCode messagingErrorCode = e.getMessagingErrorCode();

            if (result == NotificationSendResult.TERMINAL_FAILURE) {
                log.warn(
                        "FCM send terminal failure. userId={}, type={}, targetId={}, messagingErrorCode={}, errorCode={}, message={}",
                        userId,
                        notificationType,
                        targetId,
                        messagingErrorCode,
                        e.getErrorCode(),
                        e.getMessage(),
                        e
                );
                return result;
            }

            log.warn(
                    "FCM send retryable failure. userId={}, type={}, targetId={}, messagingErrorCode={}, errorCode={}, message={}",
                    userId,
                    notificationType,
                    targetId,
                    messagingErrorCode,
                    e.getErrorCode(),
                    e.getMessage(),
                    e
            );
            return result;
        } catch (Exception e) {
            log.warn(
                    "FCM send retryable failure. userId={}, type={}, targetId={}, error={}",
                    userId,
                    notificationType,
                    targetId,
                    e.getClass().getSimpleName(),
                    e
            );
            return NotificationSendResult.RETRYABLE_FAILURE;
        }
    }

    private NotificationSendResult classifyFirebaseFailure(FirebaseMessagingException e) {
        MessagingErrorCode messagingErrorCode = e.getMessagingErrorCode();
        if (messagingErrorCode == MessagingErrorCode.UNREGISTERED
                || messagingErrorCode == MessagingErrorCode.SENDER_ID_MISMATCH) {
            return NotificationSendResult.TERMINAL_FAILURE;
        }

        return NotificationSendResult.RETRYABLE_FAILURE;
    }
}
