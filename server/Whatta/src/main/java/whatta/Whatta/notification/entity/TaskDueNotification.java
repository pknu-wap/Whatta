package whatta.Whatta.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import whatta.Whatta.notification.enums.DueNotificationType;
import whatta.Whatta.notification.enums.NotiStatus;

import java.time.LocalDateTime;

@Document("task_due_notifications")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder(toBuilder = true)
public class TaskDueNotification {
    @Id
    private String id;

    private String userId;
    //private String installationId; //TODO: 나중에 다중기기 지원한다면

    @Builder.Default
    private NotiStatus status = NotiStatus.ACTIVE;

    private String targetId;

    private DueNotificationType dueNotiType; //하루 전, 한 시간 전
    private LocalDateTime triggerAt;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
