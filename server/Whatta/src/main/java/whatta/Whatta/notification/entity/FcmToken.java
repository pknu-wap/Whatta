package whatta.Whatta.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document("fcm_tokens")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class FcmToken {

    @Id
    private String id;

    private String userId;
    //private String installationId; //TODO: 나중에 다중기기 지원한다면
    private String fcmToken;

    @Builder.Default
    private Platform platform = Platform.IOS;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    //private LocalDateTime lastUsedAt;

    private enum Platform {
        IOS,
        ANDROID,
        WEB
    }
}
