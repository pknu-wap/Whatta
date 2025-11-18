package whatta.Whatta.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import whatta.Whatta.notification.entity.FcmToken;
import whatta.Whatta.notification.repository.FcmTokenRepository;

import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class NotificationSendService {

    private final FcmTokenRepository fcmTokenRepository;
    private final FirebaseMessaging firebaseMessaging;

    public void sendSummary(String userId, String title, String body) {
        FcmToken token = fcmTokenRepository.findByUserId(userId);

        send(token.getFcmToken(), title, body, Map.of(
                "type", "SUMMARY",
                "userId", userId)
        );
    }

    private void send(String token, String title, String body, Map<String, String> data) {
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
        } catch (Exception e) {
            log.warn("FCM send failed", e);
        }
    }
}
