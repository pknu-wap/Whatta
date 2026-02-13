package whatta.Whatta.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.notification.enums.Platform;

import java.time.LocalDateTime;

@Document("fcm_tokens")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class FcmToken {

    @Id
    private String id;

    private String userId;
    //private String installationId; //TODO: 나중에 다중기기 지원한다면
    private String fcmToken;

    @Builder.Default
    private Platform platform = Platform.IOS; //TODO: 나중에 안드로이드도 한다면 디폴트 삭제

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime lastUsedAt = LocalDateTime.now();
}
