package whatta.Whatta.notification.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import whatta.Whatta.notification.entity.ScheduledNotification;
import whatta.Whatta.notification.enums.NotiStatus;
import whatta.Whatta.notification.enums.NotificationTargetType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledNotificationRepository extends MongoRepository<ScheduledNotification, String> {

    Optional<ScheduledNotification> findByTargetTypeAndTargetIdAndStatus(NotificationTargetType targetType, String targetId, NotiStatus status);

    Optional<ScheduledNotification> findByTargetTypeAndTargetIdAndStatusAndTriggerAtAfter(NotificationTargetType targetType, String targetId, NotiStatus status, LocalDateTime now);

    List<ScheduledNotification> findByStatusAndTriggerAtLessThanEqual(NotiStatus status, LocalDateTime now);
}
