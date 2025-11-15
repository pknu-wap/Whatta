package whatta.Whatta.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.notification.enums.NotificationTargetType;
import whatta.Whatta.notification.enums.NotificationType;

@Document("scheduled_notifications")
@AllArgsConstructor
@Getter
@Builder(toBuilder = true)
public class ScheduledNotification {

    private String id;

    private String userId;
    //private String installationId; //TODO: 나중에 다중기기 지원한다면

    private NotificationType type;
    private NotificationTargetType targetType;
    private String targetId;
}
