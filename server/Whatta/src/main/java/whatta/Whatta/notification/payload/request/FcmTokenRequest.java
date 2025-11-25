package whatta.Whatta.notification.payload.request;

import whatta.Whatta.notification.enums.Platform;

public record FcmTokenRequest(
        String fcmToken,
        boolean enabled,
        Platform platform

) {
}
