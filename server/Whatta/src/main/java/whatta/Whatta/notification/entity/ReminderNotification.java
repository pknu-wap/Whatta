package whatta.Whatta.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;

import java.time.LocalDateTime;

@Document("reminder_notifications")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class ReminderNotification {
    @Id
    private String id;

    private String userId;
    //private String installationId; //TODO: 나중에 다중기기 지원한다면

    @Builder.Default
    private NotiStatus status = NotiStatus.ACTIVE;

    private NotificationTargetType targetType; //EVENT, TASK
    private String targetId;

    private LocalDateTime triggerAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
