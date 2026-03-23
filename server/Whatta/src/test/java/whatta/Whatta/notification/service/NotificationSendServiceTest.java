package whatta.Whatta.notification.service;

import com.google.firebase.ErrorCode;
import com.google.firebase.FirebaseException;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import whatta.Whatta.notification.entity.FcmToken;
import whatta.Whatta.notification.enums.NotificationSendResult;
import whatta.Whatta.notification.repository.FcmTokenRepository;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSendServiceTest {

    @Mock
    private FcmTokenRepository fcmTokenRepository;

    @Mock
    private FirebaseMessaging firebaseMessaging;

    @InjectMocks
    private NotificationSendService notificationSendService;

    @Test
    void 토큰이_없으면_terminal_failure를_반환한다() {
        when(fcmTokenRepository.findByUserId("user-1")).thenReturn(null);

        NotificationSendResult result = notificationSendService.sendSummary("user-1", "title", "body");

        assertEquals(NotificationSendResult.TERMINAL_FAILURE, result);
        verifyNoInteractions(firebaseMessaging);
    }

    @Test
    void unregistered_토큰이면_terminal_failure를_반환한다() throws Exception {
        when(fcmTokenRepository.findByUserId("user-1")).thenReturn(validToken("user-1"));
        doThrow(firebaseMessagingException(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND, "unregistered token"))
                .when(firebaseMessaging)
                .send(org.mockito.ArgumentMatchers.any());

        NotificationSendResult result = notificationSendService.sendReminder("user-1", "title", "body", "target-1");

        assertEquals(NotificationSendResult.TERMINAL_FAILURE, result);
    }

    @Test
    void unavailable_에러면_retryable_failure를_반환한다() throws Exception {
        when(fcmTokenRepository.findByUserId("user-1")).thenReturn(validToken("user-1"));
        doThrow(firebaseMessagingException(MessagingErrorCode.UNAVAILABLE, ErrorCode.UNAVAILABLE, "temporary outage"))
                .when(firebaseMessaging)
                .send(org.mockito.ArgumentMatchers.any());

        NotificationSendResult result = notificationSendService.sendSummary("user-1", "title", "body");

        assertEquals(NotificationSendResult.RETRYABLE_FAILURE, result);
    }

    private FcmToken validToken(String userId) {
        return FcmToken.builder()
                .userId(userId)
                .fcmToken("valid-token")
                .build();
    }

    private FirebaseMessagingException firebaseMessagingException(
            MessagingErrorCode messagingErrorCode,
            ErrorCode errorCode,
            String message
    ) throws Exception {
        FirebaseException baseException = new FirebaseException(errorCode, message, null);
        Method method = FirebaseMessagingException.class.getDeclaredMethod(
                "withMessagingErrorCode",
                FirebaseException.class,
                MessagingErrorCode.class
        );
        method.setAccessible(true);
        return (FirebaseMessagingException) method.invoke(null, baseException, messagingErrorCode);
    }
}
